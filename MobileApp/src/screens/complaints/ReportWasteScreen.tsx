import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import {
  ensureLocationPermission,
  getCurrentCoordinates,
  usingDemoLocation,
} from '../../utils/location';
import { validateDescription, validateAddress } from '../../utils/validation';
import { createComplaint } from '../../services/complaint';
import { ApiError } from '../../services/api';
import Button from '../../components/Button';
import { colors } from '../../constants/colors';
import { radius, spacing, typography } from '../../constants/spacing';
import type { Coordinates } from '../../types/complaint';
import { generateUuid } from '../../utils/uuid';

type Props = NativeStackScreenProps<HomeStackParamList, 'ReportWaste'>;

type LocationState =
  | { status: 'checking' }
  | { status: 'granted'; coords: Coordinates }
  | { status: 'locating' }
  | { status: 'denied' }
  | { status: 'blocked' }
  | { status: 'error'; message: string };

export default function ReportWasteScreen({ navigation }: Props) {
  const [image, setImage] = useState<Asset | null>(null);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');

  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  // One key per report: a retry after a timeout returns the complaint the
  // server already created instead of creating a second one.
  const idempotencyKeyRef = useRef<string | null>(null);
  const [location, setLocation] = useState<LocationState>({
    status: 'checking',
  });

  // ============================================================
  // LOCATION
  // ============================================================

  const detectLocation = useCallback(async () => {
    setLocation({ status: 'checking' });

    const permission = await ensureLocationPermission();

    if (permission === 'blocked') {
      setLocation({ status: 'blocked' });
      return;
    }

    if (permission === 'denied' || permission === 'unavailable') {
      setLocation({ status: 'denied' });
      return;
    }

    setLocation({ status: 'locating' });

    try {
      const coords = await getCurrentCoordinates();

      setLocation({
        status: 'granted',
        coords,
      });
    } catch (e: any) {
      setLocation({
        status: 'error',
        message:
          e?.message ?? 'Could not detect your location.',
      });
    }
  }, []);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  // ============================================================
  // CAMERA
  // ============================================================

  const handleTakePhoto = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.7,
      // Keeps uploads well under the backend's 5MB limit.
      maxWidth: 1600,
      maxHeight: 1600,
      saveToPhotos: false,
    });

    if (result.didCancel) {
      return;
    }

    if (result.errorCode) {
      setImageError(
        'Could not access the camera. Please check camera permissions.',
      );
      return;
    }

    const asset = result.assets?.[0];

    if (asset) {
      setImage(asset);
      setImageError(null);
    }
  };

  // ============================================================
  // GALLERY
  // ============================================================

  const handleChooseFromGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.7,
      maxWidth: 1600,
      maxHeight: 1600,
    });

    if (result.didCancel) {
      return;
    }

    if (result.errorCode) {
      setImageError('Could not open the photo library.');
      return;
    }

    const asset = result.assets?.[0];

    if (asset) {
      setImage(asset);
      setImageError(null);
    }
  };

  // ============================================================
  // SUBMIT COMPLAINT
  // ============================================================

  const handleSubmit = async () => {
    const descError = validateDescription(description);
    const addrError = validateAddress(address);

    setDescriptionError(descError);
    setAddressError(addrError);
    setImageError(null);
    setFormError(null);

    // A photo is optional (the backend accepts text-only reports), but it
    // gives a much better AI assessment, so the UI encourages it.
    if (descError || addrError) {
      return;
    }

    // Location is mandatory
    if (location.status !== 'granted') {
      setFormError(
        'We need your location before you can submit. Please enable location access.',
      );
      return;
    }

    setSubmitting(true);

    try {
      // ----------------------------------------------------------
      // Send complaint to backend
      // Backend performs:
      // 1. One AI analysis of photo + description
      // 2. Nearby complaint search + AI duplicate suggestion
      // 3. Rule-based priority from the analysed features
      // ----------------------------------------------------------

      idempotencyKeyRef.current ??= generateUuid();

      const result = await createComplaint({
        idempotencyKey: idempotencyKeyRef.current,
        description: description.trim(),
        address: address.trim(),
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        ...(image?.uri && {
          imageUri: image.uri,
          imageName: image.fileName ?? 'complaint.jpg',
          imageType: image.type ?? 'image/jpeg',
        }),
      });

      // ----------------------------------------------------------
      // SUCCESS: show what the AI made of it (incl. any duplicate
      // suggestion; the complaint is saved either way).
      // ----------------------------------------------------------

      navigation.replace('SubmissionResult', { result });
    } catch (e) {
      setFormError(
        e instanceof ApiError
          ? e.message
          : 'Could not submit your complaint. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={
        Platform.OS === 'ios' ? 'padding' : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ======================================================
            PHOTO
        ====================================================== */}

        <Text style={styles.sectionLabel}>
          1. Photo (recommended)
        </Text>

        {!image && (
          <Text style={styles.hintText}>
            Optional, but a photo lets the AI judge the type, size and hazards much
            more accurately.
          </Text>
        )}

        {image ? (
          <View style={styles.previewWrapper}>
            <Image
              source={{ uri: image.uri }}
              style={styles.preview}
            />

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.previewActionBtn}
                onPress={handleTakePhoto}
                disabled={submitting}
              >
                <Text style={styles.previewActionText}>
                  Retake
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.previewActionBtn}
                onPress={() => setImage(null)}
                disabled={submitting}
              >
                <Text style={styles.previewActionText}>
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.captureRow}>
            <TouchableOpacity
              style={styles.captureBtn}
              onPress={handleTakePhoto}
              disabled={submitting}
            >
              <Text style={styles.captureBtnIcon}>
                📷
              </Text>

              <Text style={styles.captureBtnText}>
                Take Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureBtnSecondary}
              onPress={handleChooseFromGallery}
              disabled={submitting}
            >
              <Text style={styles.captureBtnIcon}>
                🖼
              </Text>

              <Text style={styles.captureBtnTextSecondary}>
                Choose from Gallery
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!!imageError && (
          <Text style={styles.errorText}>
            {imageError}
          </Text>
        )}

        {/* ======================================================
            LOCATION
        ====================================================== */}

        <Text style={styles.sectionLabel}>
          2. Location
        </Text>

        <LocationIndicator
          state={location}
          onRetry={detectLocation}
        />

        {usingDemoLocation && (
          <Text style={styles.hintText}>
            Demo location in use (set in config.ts), not this phone's GPS.
          </Text>
        )}

        {/* ======================================================
            ADDRESS
        ====================================================== */}

        <Text style={styles.sectionLabel}>
          3. Address
        </Text>

        <TextInput
          style={[
            styles.textInput,
            !!addressError && styles.textInputError,
          ]}
          placeholder="Street, area, landmark…"
          placeholderTextColor={colors.textMuted}
          value={address}
          onChangeText={setAddress}
          editable={!submitting}
          accessibilityLabel="Address"
        />

        {!!addressError && (
          <Text style={styles.errorText}>
            {addressError}
          </Text>
        )}

        {/* ======================================================
            DESCRIPTION
        ====================================================== */}

        <Text style={styles.sectionLabel}>
          4. Description
        </Text>

        <TextInput
          style={[
            styles.textArea,
            !!descriptionError && styles.textInputError,
          ]}
          placeholder="Describe what you see — pile size, type of waste, any hazards…"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!submitting}
          accessibilityLabel="Complaint description"
        />

        {!!descriptionError && (
          <Text style={styles.errorText}>
            {descriptionError}
          </Text>
        )}

        {/* ======================================================
            FORM ERROR
        ====================================================== */}

        {!!formError && (
          <View style={styles.formErrorBox}>
            <Text style={styles.formErrorTextBox}>
              {formError}
            </Text>
          </View>
        )}

        {/* ======================================================
            SUBMIT
        ====================================================== */}

        <View style={styles.submitWrapper}>
          <Button
            label={
              submitting
                ? 'Analyzing Complaint…'
                : 'Submit Complaint'
            }
            onPress={handleSubmit}
            loading={submitting}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// LOCATION INDICATOR
// ============================================================

function LocationIndicator({
  state,
  onRetry,
}: {
  state: LocationState;
  onRetry: () => void;
}) {
  if (
    state.status === 'checking' ||
    state.status === 'locating'
  ) {
    return (
      <View style={styles.locationBox}>
        <Text style={styles.locationBoxText}>
          {state.status === 'checking'
            ? 'Checking permissions…'
            : 'Detecting your location…'}
        </Text>
      </View>
    );
  }

  if (state.status === 'granted') {
    return (
      <View
        style={[
          styles.locationBox,
          styles.locationBoxOk,
        ]}
      >
        <View style={styles.locationDotOk} />

        <Text style={styles.locationBoxTextOk}>
          Location detected
        </Text>
      </View>
    );
  }

  const message =
    state.status === 'blocked'
      ? 'Location access is blocked. Please enable it in system settings.'
      : state.status === 'error'
        ? state.message
        : 'Location permission is required to report waste.';

  return (
    <View
      style={[
        styles.locationBox,
        styles.locationBoxError,
      ]}
    >
      <Text style={styles.locationBoxTextError}>
        {message}
      </Text>

      <TouchableOpacity
        onPress={onRetry}
        style={styles.retryBtn}
      >
        <Text style={styles.retryBtnText}>
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  sectionLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  captureRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  captureBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  captureBtnSecondary: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  captureBtnIcon: {
    fontSize: 26,
    marginBottom: spacing.xs,
  },

  captureBtnText: {
    ...typography.captionMedium,
    color: colors.textInverse,
  },

  captureBtnTextSecondary: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },

  previewWrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },

  preview: {
    width: '100%',
    height: 220,
    backgroundColor: colors.divider,
  },

  previewActions: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.sm,
  },

  previewActionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  previewActionText: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },

  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  locationBoxOk: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBg,
  },

  locationBoxError: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBg,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  locationDotOk: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },

  locationBoxText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  locationBoxTextOk: {
    ...typography.captionMedium,
    color: colors.success,
  },

  locationBoxTextError: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },

  retryBtn: {
    alignSelf: 'flex-start',
  },

  retryBtnText: {
    ...typography.captionMedium,
    color: colors.danger,
    textDecorationLine: 'underline',
  },

  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },

  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 110,
    ...typography.body,
    color: colors.textPrimary,
  },

  textInputError: {
    borderColor: colors.danger,
  },

  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },

  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  formErrorBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },

  formErrorTextBox: {
    ...typography.caption,
    color: colors.danger,
  },

  submitWrapper: {
    marginTop: spacing.xl,
  },
});

