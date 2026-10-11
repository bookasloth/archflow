// A4 invoice document (react-pdf). One layout, three templates — templates only change type,
// rules and accent; every number comes from the shared calc engine via InvoiceDoc.
// Pagination: rows and the totals/signature blocks never split (wrap={false}); a running
// header + "Page x of y" footer repeat on every page.
import path from 'node:path'
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import { formatINR, qtyString, percentString } from '@/lib/invoice/money'
import { formatDate, type InvoiceDoc, type Template } from '@/lib/invoice/model'

const FONT_DIR = path.join(process.cwd(), 'lib/invoice/pdf/fonts')
let fontsReady = false
function registerFonts() {
  if (fontsReady) return
  Font.register({
    family: 'Poppins',
    fonts: [
      { src: path.join(FONT_DIR, 'Poppins-Regular.ttf'), fontWeight: 400 },
      { src: path.join(FONT_DIR, 'Poppins-Medium.ttf'), fontWeight: 500 },
      { src: path.join(FONT_DIR, 'Poppins-SemiBold.ttf'), fontWeight: 600 },
    ],
  })
  Font.register({
    family: 'Spectral',
    fonts: [
      { src: path.join(FONT_DIR, 'Spectral-Regular.ttf'), fontWeight: 400 },
      { src: path.join(FONT_DIR, 'Spectral-Medium.ttf'), fontWeight: 500 },
      { src: path.join(FONT_DIR, 'Spectral-Italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
    ],
  })
  Font.registerHyphenationCallback((word) => [word]) // never hyphenate names/amounts
  fontsReady = true
}

const INK = '#111111'
const MUTED = '#6B6B6B'
const RULE = '#D9D9D9'

type Theme = { display: string; title: (accent: string) => Style; rule: (accent: string) => string; band: boolean }
const THEMES: Record<Template, Theme> = {
  // Minimal Studio: black and white, typography-led.
  minimal: { display: 'Poppins', title: () => ({ color: INK, fontWeight: 600, letterSpacing: 2 }), rule: () => INK, band: false },
  // Editorial Architecture: serif display, hairlines, small-caps section labels.
  editorial: { display: 'Spectral', title: () => ({ color: INK, fontWeight: 500, fontSize: 22, letterSpacing: 0.5 }), rule: () => INK, band: false },
  // Modern Professional: one restrained accent for the title, rules and the payable line.
  modern: { display: 'Poppins', title: (a) => ({ color: a, fontWeight: 600, letterSpacing: 1.5 }), rule: (a) => a, band: true },
}

const s = StyleSheet.create({
  page: { fontFamily: 'Poppins', fontSize: 8.5, color: INK, paddingTop: 40, paddingBottom: 48, paddingHorizontal: 44, lineHeight: 1.45 },
  running: { position: 'absolute', top: 20, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: MUTED },
  // pinned with `top` (A4 = 841.89pt): react-pdf drops dynamic `render` text anchored by `bottom`
  footerLeft: { position: 'absolute', top: 806, left: 44, right: 200, fontSize: 7, color: MUTED },
  footerRight: { position: 'absolute', top: 806, left: 200, right: 44, textAlign: 'right', fontSize: 7, color: MUTED },
  row: { flexDirection: 'row' },
  label: { fontSize: 6.5, color: MUTED, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 },
  muted: { color: MUTED },
  th: { fontSize: 6.5, color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' },
  num: { textAlign: 'right' },
  stamp: { position: 'absolute', top: 330, left: 0, right: 0, textAlign: 'center', fontSize: 64, lineHeight: 1, color: '#000000', opacity: 0.06, transform: 'rotate(-24deg)', letterSpacing: 8 },
})

function Party({ title, name, lines }: { title: string; name: string; lines: (string | null | undefined)[] }) {
  return (
    <View style={{ flex: 1, paddingRight: 12 }}>
      <Text style={s.label}>{title}</Text>
      <Text style={{ fontWeight: 600, fontSize: 9.5, lineHeight: 1.35 }}>{name}</Text>
      {lines.filter(Boolean).map((l, i) => (
        <Text key={i} style={s.muted}>{l}</Text>
      ))}
    </View>
  )
}

function TotalRow({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: string }) {
  return (
    <View style={[s.row, { justifyContent: 'space-between', paddingVertical: 2.5 }, strong ? { borderTopWidth: 0.75, borderTopColor: accent ?? INK, paddingTop: 5, marginTop: 3 } : {}]}>
      <Text style={strong ? { fontWeight: 600, fontSize: 10, lineHeight: 1.3 } : s.muted}>{label}</Text>
      <Text style={[s.num, strong ? { fontWeight: 600, fontSize: 10, lineHeight: 1.3, color: accent ?? INK } : {}]}>{value}</Text>
    </View>
  )
}

export function InvoicePdf({ doc }: { doc: InvoiceDoc }) {
  const t = THEMES[doc.template]
  const rule = t.rule(doc.accent)
  const { seller, buyer, totals } = doc
  const tax = doc.chargesTax
  const money = (p: number) => formatINR(p, false)
  const pct = (bps: number) => `${percentString(bps)}%`
  const sellerAddress = [seller.address, [seller.city, seller.state, seller.pin].filter(Boolean).join(', '), seller.country !== 'India' ? seller.country : null]
  const ref = doc.number ?? 'DRAFT'

  // column widths (sum = 100)
  const W = tax
    ? { no: 5, desc: 37, qty: 10, rate: 12, disc: 9, gst: 7, amt: 20 }
    : { no: 5, desc: 44, qty: 11, rate: 14, disc: 10, gst: 0, amt: 16 }
  const col = (w: number) => ({ width: `${w}%` })

  return (
    <Document title={`${doc.title} ${ref}`} author={seller.firm_name} creator="Archflow">
      <Page size="A4" style={s.page}>
        {t.band && <View fixed style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: doc.accent }} />}
        <View fixed style={s.running} render={({ pageNumber }) => (pageNumber > 1 ? <><Text>{seller.firm_name}</Text><Text>{doc.title} {ref} · continued</Text></> : null)} />
        <Text fixed style={s.footerLeft}>{seller.footer_note || 'Thank you for your business.'}</Text>
        <Text fixed style={s.footerRight} render={({ pageNumber, totalPages }) => `${ref} · Page ${pageNumber} of ${totalPages}`} />
        {doc.status === 'draft' && <Text fixed style={s.stamp}>DRAFT</Text>}
        {doc.status === 'cancelled' && <Text fixed style={s.stamp}>CANCELLED</Text>}

        {/* Header */}
        <View style={[s.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
          <View style={{ width: '58%' }}>
            {seller.logo_data && <Image src={seller.logo_data} style={{ maxHeight: 40, maxWidth: 140, objectFit: 'contain', marginBottom: 8 }} />}
            <Text style={{ fontFamily: t.display, fontSize: doc.template === 'editorial' ? 16 : 12.5, lineHeight: 1.25, fontWeight: doc.template === 'editorial' ? 500 : 600, marginBottom: 2 }}>{seller.firm_name}</Text>
            {seller.principal_name && <Text style={s.muted}>{seller.principal_name}{seller.registration ? ` · ${seller.registration}` : ''}</Text>}
            {sellerAddress.filter(Boolean).map((l, i) => <Text key={i} style={s.muted}>{l}</Text>)}
            <Text style={s.muted}>{[seller.phone, seller.email, seller.website].filter(Boolean).join('  ·  ')}</Text>
            {(seller.gstin || seller.pan) && (
              <Text style={{ marginTop: 2 }}>{[seller.gstin && `GSTIN ${seller.gstin}`, seller.pan && `PAN ${seller.pan}`].filter(Boolean).join('   ')}</Text>
            )}
          </View>
          <View style={{ width: '40%', alignItems: 'flex-end' }}>
            <Text style={[{ fontFamily: t.display, fontSize: 16, lineHeight: 1.2, textTransform: doc.template === 'editorial' ? 'none' : 'uppercase' }, t.title(doc.accent)]}>{doc.title}</Text>
            <Text style={{ fontWeight: 600, marginTop: 8 }}>{ref}</Text>
            <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
              <Text><Text style={s.muted}>Date  </Text>{formatDate(doc.invoiceDate)}</Text>
              {doc.dueDate && <Text><Text style={s.muted}>Due  </Text>{formatDate(doc.dueDate)}</Text>}
              {doc.poReference && <Text><Text style={s.muted}>PO / WO  </Text>{doc.poReference}</Text>}
              {doc.status === 'cancelled' && <Text style={{ marginTop: 4 }}>Cancelled{doc.cancelReason ? ` — ${doc.cancelReason}` : ''}</Text>}
            </View>
          </View>
        </View>

        <View style={{ borderBottomWidth: doc.template === 'editorial' ? 0.5 : 1, borderBottomColor: rule, marginTop: 12, marginBottom: doc.template === 'editorial' ? 1.5 : 0 }} />
        {doc.template === 'editorial' && <View style={{ borderBottomWidth: 0.5, borderBottomColor: rule }} />}

        {/* Parties */}
        <View style={[s.row, { marginTop: 12, marginBottom: 12 }]}>
          <Party
            title="Billed to"
            name={buyer.name}
            lines={[
              buyer.contact_person && `Attn: ${buyer.contact_person}`,
              buyer.billing_address,
              [buyer.state, buyer.pin].filter(Boolean).join(' '),
              buyer.gstin && `GSTIN ${buyer.gstin}`,
              [buyer.phone, buyer.email].filter(Boolean).join('  ·  '),
            ]}
          />
          {doc.project ? (
            <Party
              title="Project"
              name={doc.project.name}
              lines={[
                [doc.project.code, doc.project.reference].filter(Boolean).join(' · ') || null,
                doc.project.location,
                buyer.site_address && `Site: ${buyer.site_address}`,
              ]}
            />
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Party
            title="Supply"
            name={tax ? (totals.interState ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)') : 'No GST charged'}
            lines={[
              doc.placeOfSupply && `Place of supply: ${doc.placeOfSupply}`,
              tax ? `Prices ${doc.taxMode === 'inclusive' ? 'include' : 'exclude'} GST` : null,
            ]}
          />
        </View>

        {/* Items */}
        <View style={[s.row, { borderBottomWidth: 0.75, borderBottomColor: rule, paddingBottom: 4 }]}>
          <Text style={[s.th, col(W.no)]}>#</Text>
          <Text style={[s.th, col(W.desc)]}>Description</Text>
          <Text style={[s.th, s.num, col(W.qty)]}>Qty</Text>
          <Text style={[s.th, s.num, col(W.rate)]}>Rate</Text>
          <Text style={[s.th, s.num, col(W.disc)]}>Disc.</Text>
          {tax && <Text style={[s.th, s.num, col(W.gst)]}>GST</Text>}
          <Text style={[s.th, s.num, col(W.amt)]}>{tax ? 'Taxable' : 'Amount'}</Text>
        </View>
        {doc.lines.map((l, i) => (
          <View key={i} wrap={false} style={[s.row, { paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: RULE }]}>
            <Text style={[col(W.no), s.muted]}>{i + 1}</Text>
            <View style={[col(W.desc), { paddingRight: 8 }]}>
              <Text>{l.description}</Text>
              {l.category && <Text style={[s.muted, { fontSize: 7 }]}>{l.category}</Text>}
            </View>
            <Text style={[s.num, col(W.qty)]}>{qtyString(l.qty)}{l.unit ? ` ${l.unit}` : ''}</Text>
            <Text style={[s.num, col(W.rate)]}>{money(l.rate)}</Text>
            <Text style={[s.num, col(W.disc)]}>{l.discount ? money(l.discount) : '—'}</Text>
            {tax && <Text style={[s.num, col(W.gst)]}>{pct(l.tax_rate)}</Text>}
            <Text style={[s.num, col(W.amt)]}>{money(l.taxable)}</Text>
          </View>
        ))}

        {/* Totals (never split across pages) */}
        <View wrap={false} style={[s.row, { marginTop: 12 }]}>
          <View style={{ width: '52%', paddingRight: 16 }}>
            <Text style={s.label}>Amount payable in words</Text>
            <Text>{doc.words}</Text>
            {tax && totals.slabs.some((x) => x.rate > 0) && (
              <View style={{ marginTop: 10 }}>
                <Text style={s.label}>Tax summary</Text>
                {totals.slabs.filter((x) => x.rate > 0).map((x) => (
                  <Text key={x.rate} style={s.muted}>
                    {pct(x.rate)} on {money(x.taxable)} —{' '}
                    {totals.interState ? `IGST ${money(x.igst)}` : `CGST ${money(x.cgst)} + SGST ${money(x.sgst)}`}
                  </Text>
                ))}
              </View>
            )}
          </View>
          <View style={{ width: '48%' }}>
            <TotalRow label="Subtotal" value={money(totals.subtotal)} />
            {totals.discount > 0 && <TotalRow label="Discount" value={`− ${money(totals.discount)}`} />}
            {tax && <TotalRow label="Taxable value" value={money(totals.taxable)} />}
            {tax && !totals.interState && <TotalRow label="CGST" value={money(totals.cgst)} />}
            {tax && !totals.interState && <TotalRow label="SGST" value={money(totals.sgst)} />}
            {tax && totals.interState && <TotalRow label="IGST" value={money(totals.igst)} />}
            {totals.roundOff !== 0 && <TotalRow label="Round off" value={(totals.roundOff > 0 ? '+ ' : '− ') + money(Math.abs(totals.roundOff))} />}
            <TotalRow label="Invoice total" value={formatINR(totals.total)} strong={!(totals.advanceAdjusted || totals.retention)} accent={rule} />
            {totals.advanceAdjusted > 0 && <TotalRow label="Less: advance received" value={`− ${money(totals.advanceAdjusted)}`} />}
            {totals.retention > 0 && <TotalRow label="Less: retention" value={`− ${money(totals.retention)}`} />}
            {(totals.advanceAdjusted > 0 || totals.retention > 0) && <TotalRow label="Amount payable" value={formatINR(totals.payable)} strong accent={rule} />}
            {doc.paid > 0 && <TotalRow label="Paid to date" value={`− ${money(doc.paid)}`} />}
            {doc.paid > 0 && <TotalRow label="Balance due" value={formatINR(doc.balance)} strong accent={rule} />}
          </View>
        </View>

        {/* Payment + terms */}
        {(seller.bank_details || seller.upi_id || doc.paymentInstructions) && (
          <View wrap={false} style={{ marginTop: 14 }}>
            <Text style={s.label}>Payment</Text>
            {doc.paymentInstructions && <Text>{doc.paymentInstructions}</Text>}
            {seller.bank_details && <Text style={s.muted}>{seller.bank_details}</Text>}
            {seller.upi_id && <Text><Text style={s.muted}>UPI  </Text>{seller.upi_id}</Text>}
          </View>
        )}
        {doc.notes && (
          <View wrap={false} style={{ marginTop: 12 }}>
            <Text style={s.label}>Notes</Text>
            <Text>{doc.notes}</Text>
          </View>
        )}
        {doc.terms && (
          <View style={{ marginTop: 12 }}>
            <Text style={s.label}>Terms</Text>
            <Text style={s.muted}>{doc.terms}</Text>
          </View>
        )}

        {/* Signature */}
        <View wrap={false} style={{ marginTop: 16, alignItems: 'flex-end' }}>
          {seller.signature_data && <Image src={seller.signature_data} style={{ maxHeight: 44, maxWidth: 150, objectFit: 'contain', marginBottom: 4 }} />}
          <Text style={{ fontWeight: 600 }}>For {seller.firm_name}</Text>
          <Text style={s.muted}>Authorised signatory</Text>
        </View>

      </Page>
    </Document>
  )
}

export async function renderInvoicePdf(doc: InvoiceDoc): Promise<Buffer> {
  registerFonts()
  return renderToBuffer(<InvoicePdf doc={doc} />)
}

export { pdfFileName } from '@/lib/invoice/pdf/fileName'
