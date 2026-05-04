Drop reference garment photos here. Perfect Corp's cloth-v3 endpoint
transfers the garment from a reference image onto the selfie. The reference
can be either a product flat-lay OR a full-body photo of someone wearing it.

Required filenames (referenced by apps/web/src/lib/event-templates.ts):
  date.jpg       — Date Night       (Slip Dress)
  interview.jpg  — Job Interview    (Tailored Blazer outfit)
  wedding.jpg    — Wedding Guest    (Midi Dress)
  vacation.jpg   — Vacation         (Linen Set)
  casual.jpg     — Casual Friday    (Denim Set)

Each event currently uses garment_category = "full_body". If you switch to
a top-only or bottom-only photo, also update `garmentCategory` in
event-templates.ts to "top" / "bottom" / "dress" as appropriate.
