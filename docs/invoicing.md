# Invoicing (admin-only)

Professional GST-aware invoices for the practice: business profile → clients → projects →
invoice editor → PDF preview → issue → share → record payments. Lives at **/invoices**
(sidebar → Admin → Invoices). Staff cannot see any of it — enforced by RLS, not just the UI.

## Setup (once)

1. **Apply migrations** in the Supabase SQL editor, in order:
   - `supabase/migrations/0011_invoicing.sql` — tables, RLS, numbering/payment/cancel/share functions.
   - `supabase/migrations/0012_api_grants.sql` — explicit API-role grants (fresh projects need them;
     no-op on the current project) + lets the SQL editor / service key set the first admin.
2. Be an admin: `update profiles set role = 'admin' where id = '<your auth user id>';`
3. Open **Invoices → Settings**, fill in the practice (state + GSTIN decide the tax treatment), save.

No new environment variables. One new dependency: `@react-pdf/renderer` (PDF rendering);
fonts (Poppins, Spectral — OFL) are committed under `lib/invoice/pdf/fonts/`.

## How it works

| Piece | Where |
|---|---|
| Money/tax engine (integer paise, BigInt, half-up) | `lib/invoice/calc.ts`, `money.ts` |
| Status, numbering format, document types, categories | `lib/invoice/rules.ts` |
| Rows → document (drafts live, issued from snapshots) | `lib/invoice/model.ts`, `data.ts` |
| PDF (3 templates, A4, paginated) | `lib/invoice/pdf/InvoicePdf.tsx` |
| Server actions (all re-check admin) | `app/(app)/invoice-actions.ts` |
| Admin PDF / client link | `app/api/invoices/[id]/pdf`, `app/i/[token]` |
| Screens | `app/(app)/invoices/*`, `components/invoice/*` |

- **Numbers** are allocated only when a draft is **issued** (`issue_invoice()`), under a row lock on
  `invoice_sequences` + a unique constraint: sequential, no duplicates, never reused (cancelled
  invoices keep theirs). Format `PREFIX/2026-27/0001` (per financial year) or `PREFIX-0001`.
- **Issued invoices are frozen** by trigger: seller/client/project are snapshotted at issue; only
  cancel is allowed afterwards. To change one: Duplicate (new draft) and cancel the old.
- **Payments** go through `record_payment()` (locks the invoice, rejects overpayment) and are
  **voided with a reason, never deleted**. Every step is in `invoice_events` (history panel).
- **Advance received** is a deduction on the invoice itself; recorded payments are separate, so
  money is never counted twice. Payable = total − advance − retention; balance = payable − paid.
- **Client link** `/i/<token>`: the PDF of one issued invoice, readable only with its unguessable
  token (`get_shared_invoice()`), no login, `noindex`.

## GST — please verify with your CA

Rates are per line (0/5/12/18/28 or any). CGST+SGST vs IGST is decided by **business state vs place
of supply**; place of supply defaults to the **project site state** (services on immovable property)
else the client's state, and is editable. Unregistered practices issue "Invoice"/"Bill of Supply"
with no GST. This is configurable tooling, **not a compliance guarantee** — rates, place of supply
and document type for each engagement should be confirmed by a professional. Not implemented:
e-invoicing (IRN/QR), HSN/SAC code column, reverse charge, TDS deduction lines.

## Sharing — what actually happens

- **Download PDF / Print** — real PDF from the server (Print opens it; print from the viewer).
- **Share PDF…** (phones) — the native share sheet with the PDF *file* attached (WhatsApp, Mail…).
- **WhatsApp message / Email** — opens WhatsApp/your mail app with the text and the client link;
  nothing is sent until you press send. Links can't attach files — the client opens the PDF via the link.
- Success messages appear only after the browser confirms (copy, share).

## Tests

```bash
npm test                       # engine, GST, words, status, numbering, validation, multi-page PDF
supabase start                 # local stack (ports 573xx, see supabase/config.toml)
# DB tests (RLS isolation, concurrent numbering, frozen issues, payments, share token):
LOCAL_SUPABASE_URL=http://127.0.0.1:57321 LOCAL_SUPABASE_ANON_KEY=<anon> LOCAL_SUPABASE_SERVICE_KEY=<service_role> npx vitest run tests/invoice-db.test.ts
```
(`supabase status -o env` prints the local keys. The DB tests skip themselves without these vars.)

## Manual QA checklist

- [ ] Settings: save profile; GSTIN required only when "GST-registered"; next number preview shows.
- [ ] Clients: add, search, edit; deleting a client with invoices is refused with a message.
- [ ] Projects: add billing to an existing project; set site state; fee shows ₹ with Indian grouping.
- [ ] New invoice: pick project → client + place of supply fill in; IGST shows for another state.
- [ ] Lines: add/reorder/remove; % and ₹ discounts; an exempt (0%) line; totals = hand calculation.
- [ ] Save with a blank line → field errors, nothing saved. Save valid → lands on the invoice.
- [ ] Preview: switch the 3 templates; Download in a template; DRAFT watermark on drafts.
- [ ] Issue → number assigned; Edit disappears; trying to change it is impossible.
- [ ] Share ▾: WhatsApp opens with the right number/text/link; client link opens the PDF logged-out.
- [ ] Record a partial payment → Partially paid; overpay → refused; rest → Paid; void → history kept.
- [ ] Past due + unpaid → Overdue; fully paid is never overdue.
- [ ] Duplicate → new unnumbered draft with the same lines, today's date.
- [ ] Cancel (with reason) → CANCELLED mark on PDF; the next invoice gets the next number.
- [ ] Log in as staff → Invoices shows "admin-only"; /api/invoices/<id>/pdf → nothing.
- [ ] Phone: editor and dashboard usable at 375px; Share PDF… attaches the file.
- [ ] 30+ lines → multi-page PDF with page numbers; totals and signature intact on the last page.
