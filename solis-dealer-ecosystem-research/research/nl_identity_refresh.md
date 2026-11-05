# Netherlands identity and warranty research refresh

Access date 3 November 2026. This follow-up re-opened the Dutch website and checked the earlier identity source register and report. No registration, lookup, enquiry or other form was submitted. No personal documents or identifiers were supplied. Findings concern public surfaces and their published descriptions, not operational success behind them.

## Material correction for the report

**Dutch warranty registration is Verified present as a public journey.** The prior report row saying only Germany's form was verified and the Dutch workflow untested is incomplete. The Dutch warranty page links directly to a Dutch registration page; the service route also includes a registration CTA. A registration entry point and form can be verified without submitting them. Successful registration, warranty activation, processing SLA, machine-record creation, duplicate checking and private claim administration remain unverified. This is a correction of research coverage; no deployment date was established and it must not be described as a newly launched capability. [I31](https://www.solistractor.nl/garantieformulier/) [I32](https://www.solistractor.nl/garantie/) [I33](https://www.solistractor.nl/klantenservice/)

Recommended replacement audit row: **Warranty registration — Verified present — Public NL warranty and service pages lead to a registration form with owner, dealer, tractor and purchase-evidence inputs; submission and processing were not tested [I31–I33].** Keep a separate row for **Warranty claims and decision workflow — Unclear / requires direct confirmation**.

## Warranty journey and concrete evidence

From the homepage, users can reach service or warranty information, then the Dutch registration form. Its visible fields cover owner, email, phone, supplying dealer, licence plate, model, serial number, purchase date, delivery hours, registration-document image and original purchase evidence. The dealer list includes the directory's main dealers and subdealer. Direct HTML inspection marks owner, email, dealer, serial, purchase date and purchase-evidence upload as required; the remaining fields lack that attribute.

The page offers a lookup action described as prefilling editable model/chassis details from plate/photo. It says the optional registration photo is deleted after reading. These are published claims; lookup, extraction quality and deletion were not tested. Invoice guidance states PDF/JPG/PNG/HEIC up to 10 MB, while the upload input's accept attribute lists PDF/JPG/JPEG/PNG. Treat this as an acceptance-test question. A separate submit action sends registration. [I31](https://www.solistractor.nl/garantieformulier/)

**Interpretation.** This provides a concrete basis for reuse: a future portal could link or integrate registration and preserve entered machine information. It does not justify building another registration form first. The prefill may use OCR, a vehicle-data service or another method; the public page does not establish the technology, supplier or authoritative source. Do not label it AI, an RDW integration or validated chassis recognition without a demonstration and documentation.

The warranty information page describes model-dependent three- or five-year coverage, selected-model extension and maintenance evidence. It says the dealer should confirm exact model, serial, terms and timing. Its extension conditions state a valid Netherlands registration plate is required. However, the form permits a blank plate when a tractor has not yet received one. These may be valid stages for different registration and extension purposes; the public material does not resolve that distinction. [I32](https://www.solistractor.nl/garantie/)

**Validation required.** Ask the warranty owner to distinguish initial machine registration, extension eligibility, approval and claim processing. Confirm whether a plate-free submission can be accepted provisionally, which checks stop approval, what confirmation is sent, and who can correct a serial number. Do not encode either public page as a universal eligibility rule until policy is reconciled.

## Service route and dealer responsibilities

Direct retrieval of the current service page succeeded after web-reader timeouts. It directs maintenance, repairs and parts questions to the regional dealer, asks customers to have model, serial and hours available, and describes dealer assessment. It separately offers registration and warranty-conditions links. This preserves the earlier finding that the public service route is dealer assisted, while adding a verified digital registration branch. It does not establish that dealers internally rely on manual records. [I33](https://www.solistractor.nl/klantenservice/)

**Interpretation.** Build discovery around one case journey: service request → machine identification → dealer assessment → part/repair decision → warranty evidence if applicable → recorded resolution. Reusing registration identifiers could reduce repeated identification, but this benefit is a hypothesis until existing records and access rights are demonstrated.

## Public privacy and controller boundary

The opened privacy page identifies the service as Solis Nederland and provides the solistractor.nl email and Schipluiden postal address; its footer names AgriXpert. It describes contact/warranty purposes, general retention/security principles and data-subject requests. It does not explicitly set out a full legal-controller identity, hosting/extraction processors, cross-company sharing, per-record retention periods or the registration-photo handling process. That is a public-documentation gap, not a conclusion that the business lacks internal arrangements or violates law. [I34](https://www.solistractor.nl/privacybeleid/)

**Interpretation.** Website operation is reasonably attributed to AgriXpert from consistent branding/footer/contact evidence. Legal responsibility for customer, machine, invoice and warranty data cannot be assigned solely from that footer. The controller and processing arrangements may differ among website leads, dealer transactions, importer support and manufacturer warranty. Obtain the actual data map and relevant agreements before joining datasets.

**Direct request.** Confirm which legal entity receives registrations, where documents are stored, which service reads the photo, whether files enter logs/backups, how deletion is verified, who receives the invoice and which dealer/manufacturer users can see each field. Request field-level permissions, retention/deletion controls and a redacted processing record. This is a concrete product and integration dependency, not an invented compliance checklist.

## Identity and parts route rechecked

The official Dutch about page states that AgriXpert represents Solis in the Netherlands and supports the dealer network, while ITL manufactures the tractors and Yanmar is an investor/technical partner. It identifies Almere as the current operational parts route for the Dutch network. The dedicated AgriXpert dealer page independently describes its import/support role and its DIGO-linked history. These support the earlier role map; they do not establish that AgriXpert and ITL's Dutch B.V. are the same legal entity. [I35](https://www.solistractor.nl/over-ons/) [I36](https://www.solistractor.nl/dealers/agrixpert/)

The information page repeats the Almere route, describes a European parts centre and technical support, and names Mitsubishi/ITL engine families and other component suppliers. Its older factory-scale counts remain present, so do not use that page alone for current group volumes or installed base. [I37](https://www.solistractor.nl/informatie/)

**Interpretation.** The correct architecture boundary remains importer/dealer support → authorised parts supply, with the actual stock owner, warehouse operator, supplier catalogue licences and ERP/WMS still unknown. Almere is a published route, not proof of a warehouse owned by AgriXpert, ITL or Yanmar. The global German/Yanmar reference remains a separately published distribution statement; no evidence here establishes whether Almere replaces, supplements or routes through it.

**Direct request.** Ask the importer to map one urgent Dutch part order and one returned/incorrect part: catalogue authority, order entry, stock owner/location, reservation, dispatch, carrier tracking, returns credit and warranty linkage. Request supported interfaces only after the responsible entity/system is identified.

## Directory count reconciled

The directory states 19 dealers plus one subdealer. The homepage states 20 sales/service points. These are compatible counting bases. The listed subdealer is Romox Tuin en Park under van Vijfeijken Machinery; the site says subdealers do not hold their own tractor stock. Generic stock labels identify a commercial dealer distinction; they do not verify available tractor models, quantities, date freshness or reservable stock. [I38](https://www.solistractor.nl/dealers/) [I39](https://www.solistractor.nl/)

**Interpretation.** Use 20 public points including one subdealer in communication; use 19 main-dealer records plus one subdealer relationship in the proposed account model. Do not call the roster a verified list of 20 contracted independent wholesale dealers. Confirm account entitlements and whether subdealer leads, orders and warranty records pass through the main dealer.

## Comparison with prior findings

| Earlier record or report statement | Refresh result | Required treatment |
|---|---|---|
| I25 says NL warranty policy verified but registration form not found on tested page | Dutch warranty page links to registration form | Supersede limitation using I31/I32; retain original as historical audit record |
| Report capability row says Germany form, NL workflow untested | NL public form and service CTA now verified | Replace row with public presence verified and processing untested |
| Machine registration/history not publicly discoverable | Registration intake is public | Separate intake from back-office registry, service history and identity reconciliation; latter unverified |
| I28 says privacy page has purposes and contact but processor/retention map unverified | Reconfirmed | Preserve and add extraction/photo/invoice data-flow questions |
| I21 identifies Almere parts route | Reconfirmed on about and information pages | Preserve published-route qualification; no warehouse ownership inference |
| I15 states 19 dealers plus one subdealer | Reconfirmed by direct retrieval | Reconcile homepage 20 points; count definitions in report |
| Solis Structures NL unresolved | No new legal-identity evidence | Keep unresolved prominently; fresh KvK and contracting-party evidence still required |

## Method and limitations

Opened original public pages with web research. Where the reader repeatedly timed out on service, directory and about pages, retrieved the same public URLs directly with HTTP 200 and inspected cleaned text. Inspected public form HTML only to distinguish required attributes, upload types and distinct actions. Did not execute lookup, upload files, supply personal data or submit registration. No browser acceptance test or private warranty/DMS walkthrough occurred. Page access dates do not establish publication/deployment dates. The report should describe these as newly verified research findings, not proven website changes.

Files compared: research/identity_sources.json and research/report.md. This subtask creates only this refresh and its new source register; it does not edit the shared report or build scripts.
