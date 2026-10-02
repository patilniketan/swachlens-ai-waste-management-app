# Evaluation data

Hand-labelled data for `npm run eval` (`scripts/eval.ts`). The script calls the
real Gemini duplicate judge and the real analysis + priority scorer, then
compares their output with your labels.

## Files

**`duplicates.csv`**: `textA,textB,distanceMeters,isDuplicate`

- `textA`: an existing report. `textB`: a new report.
- `distanceMeters`: how far apart they were (a number).
- `isDuplicate`: `true` if a person judges them the same real-world problem, else `false`.

**`priority.csv`**: `description,humanPriority`

- `humanPriority`: `CRITICAL`, `STANDARD` or `TRIVIAL`, as a person would triage it.

Quote any field that contains a comma: `"like, this"`.

## Example rows

Rows whose first field starts with `[EXAMPLE]` only illustrate the format.
Their labels were written by the developer, not collected from real reports, so
**they are skipped** unless you run `npm run eval -- --include-examples`. When
they are included, `results.json` and the portal both say so. Add your own rows
(no prefix) for a real evaluation; delete the examples whenever you like.

Fewer than 20 evaluated rows is flagged as not statistically meaningful.

## Output

`eval/results.json` (git-ignored; commit it deliberately if you want it in the
repo). The admin portal's Analytics page shows its date and row counts.
