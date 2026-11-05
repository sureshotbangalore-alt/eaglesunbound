# Netherlands customer journey refresh

Access date 3 November 2026. This refresh rechecks the Dutch site against the earlier identity audit and report. Original pages and linked journeys were opened through the web research tool. Where its fetch timed out, the same public HTTPS page was retrieved directly and its HTML text read. No lead, demo, registration, purchase or contact request was submitted; no user/customer data was entered. Native browser validation was attempted but Computer Use stopped automatically because the Windows helper could not determine the current browser URL confidently. No UI action occurred. Conclusions below concern publicly returned content, not authenticated systems or completed processing.

## Decisions this refresh changes

1. **Keep and improve existing discovery.** The Dutch site already has a 12-model range, indicative prices, a three-question selector, model comparison and configurators. The evidence supports repair, data governance and a connected dealer handoff before a replacement discovery product. [B21–B27]
2. **Upgrade comparison to Verified present.** Earlier retrieval failures were an access limitation. The comparison page and an actual S26/H26 table were now retrieved successfully. [B26]
3. **Upgrade Netherlands warranty registration form to Verified present.** The service page links to a dedicated public registration form. This does not establish successful processing, automated recognition, policy approval or machine service history. [B31,B32]
4. **Retain the selector data-quality issue, with a stronger reproduced branch.** Unknown widths appear as zero and a less-than-one-metre criterion returns larger-series models whose displayed widths are zero. This is a current public recommendation/data issue; no actual machine-width conclusion is inferred. [B24,B25]
5. **Treat the demo handoff as a concrete immediate content priority.** The live demo page includes unfinished editorial instructions about who follows up, within what time and whether the demo is nonbinding. [B28]

## Journey and public evidence

### Discover and compare

The homepage offers model/pricing, task-led selection, comparison, dealer/demo and service routes. It presents 12 models, 16–90 pk. The model index exposes price, transmission, lift capacity and comparison choices. Width appears for compact models but is omitted for several larger ones. A comparison selection count allows up to three. [B21](https://www.solistractor.nl/) [B22](https://www.solistractor.nl/modellen/)

The selector was followed using its own links: start → **Laden en verplaatsen** → **Vaak vooruit en achteruit** → **Nee, of ik weet het niet**. Counts progress 12 → 8 → 4. The final heading says four matches, while the returned text contains S26 Shuttle XL, S50 and S60 cards. S50/S60 show **0 cm** width. Treat the count mismatch as a returned-content observation pending browser layout confirmation. [B23](https://www.solistractor.nl/keuzehulp/) [B24](https://www.solistractor.nl/keuzehulp/?situation=laden&transmission=shuttle&width=any)

A second final answer, **Ja, smaller dan 1,00 meter**, returns S50, S60 and S75, each with **0 cm** width, while stating the models meet the criteria. The selection thus cannot substantiate clearance from its displayed data. Recommended behaviour is to distinguish unknown from verified width, withhold clearance assurance for unknown values and require the exact tyre/configuration width and a safety allowance. This is a proposal derived from the observed branch, not a claim about the implementation's internal cause. [B25](https://www.solistractor.nl/keuzehulp/?situation=laden&transmission=shuttle&width=100)

The comparison form uses GET field `modellen[]`. A read-only request selecting S26 and H26 returns a populated comparison of price, power, motor, transmission, drive, lift, PTO, width, execution, loader, weight, pump, use and warranty. It explicitly uses **Niet vermeld** for some unknown values. S26/H26 have distinct transmission and width values, and both link onward to configuration/demo. A differences-only control is present. Cross-page remembered selection and browser persistence were not tested. [B26](https://www.solistractor.nl/vergelijken/?modellen%5B%5D=s26&modellen%5B%5D=h26)

### Configure and request a quotation

The S26 page offers execution, tyres, loader, hydraulics/front and delivery/accessories. It publishes auto-added installation charges and a front-PTO/front-lift dependency. The stated price basis is 1 February 2026, excluding VAT, with dealer confirmation required. The quote form asks name, postcode, email, optional phone, preferred dealer and work requirements. Form source includes the model. The configuration-to-quote action exists; browser recalculation, full configuration payload, persistence, email delivery, CRM assignment, dealer acknowledgement and response time were not verified. Both a generic demo link and a model-context `?model=s26` demo link exist. [B27](https://www.solistractor.nl/modellen/s26/)

### Request a demonstration

The demo form collects tractor choice, intended use, preferred place/time, name, optional company, postcode/town, email, phone, dealer choice and privacy agreement. The page visibly contains **Nog in te vullen vóór livegang** and an editorial paragraph asking the owner to supply the follow-up promise, recipient and whether demonstration is nonbinding. Replace this with approved operational wording after a named owner agrees the actual process. The observed model query establishes URL context only; preselection and backend routing were not independently tested. [B28](https://www.solistractor.nl/demonstratie/?model=s26)

### Find a dealer and interpret stock

The locator offers province selection, identifies **19 dealers and 1 subdealer**, and shows contact/location details. The 19 dealers carry a generic **Met voorraad** label; the subdealer is explicitly described as operating under a main dealer without its own stock. These are dealer-status descriptions, not per-model quantities or availability-to-promise. The AgriXpert detail page says to call for current availability and visits/demos. It links to AgriXpert's website and provides route/phone. No live stock feed, timestamp or reservation was verified. [B29](https://www.solistractor.nl/dealers/) [B30](https://www.solistractor.nl/dealers/agrixpert/)

### Get parts and service

The service page separates workshop, technical issue, parts/implements and warranty. It asks customers to provide model, serial, hours and complaint. **Vraag een onderdeel aan** leads to the dealer locator, rather than a dedicated parts identification form. Routine maintenance and urgent machine support are dealer-contact routes. This is an observed human-assisted public journey; it is not evidence that the dealer's internal process is manual or that no private EPC exists. No publicly navigable serial-to-diagram-to-part-to-order journey was established on these pages. [B31](https://www.solistractor.nl/klantenservice/)

The information page describes an operational NL parts route via Almere and technical dealer support. Its partner list names different motor/component suppliers, reinforcing the need for build/component identity before compatibility advice. These are public company descriptions, not an inspected warehouse integration or rights agreement. [B34](https://www.solistractor.nl/informatie/)

### Register a machine for warranty

The service page's registration link leads to `/garantieformulier/`. The form collects owner/contact, supplying dealer, optional plate, model, serial, purchase date and delivery hours; an original invoice/receipt upload is required. Optional registration-document photo and a data-retrieval control are offered. The page says the photo is removed after reading and users may correct inferred fields. It explicitly warns registration does not automatically confer five-year coverage. Form presence is verified; recognition accuracy, photo deletion, successful registration, retention policies, staff review and integration were not tested. No document uploaded. [B32](https://www.solistractor.nl/garantieformulier/)

### Ask a general question or apply as a dealer

The contact form contains first/last name, email, phone, subject and message, plus privacy agreement. Subjects include dealer application, warranty and service/parts. This is an intake/contact form, not evidence of territory qualification, financial checks, agreement execution, training or automatic provisioning. [B33](https://www.solistractor.nl/contact/)

### Parallel importer purchase route and data consistency

The AgriXpert S16 product exposes an in-stock label, option choices, price excluding/including VAT, quantity and add-to-cart control. It links users to solistractor.nl for information. Its lift figure is **500 kg** and description says **90 cm** width, while the Dutch model index lists **650 kg** and **94.5 cm on standard tyres**. These are published cross-channel differences; variant/build/measurement basis may explain them, so do not choose a correct value without product-owner validation. A stock label alone does not establish quantity, exact configuration availability or ERP freshness. No cart action occurred. [B35](https://www.agrixpert.com/solis-16-4wd) [B22]

## Revised capability status

| Capability | Status | Boundary of verification |
|---|---|---|
| Dutch catalogue and indicative prices | Verified present | Current returned model/price pages; price validity still dealer-confirmed |
| Task-led selector | Verified present | Two linked result journeys followed; width and count defects observed |
| Comparison | Verified present | Real two-model table returned, including explicit unknown fields; browser persistence untested |
| S26 configuration interface | Verified present | Options/dependency copy present; browser arithmetic not tested |
| Quote intake | Verified present | Dealer/model fields and CTA present; processing unknown |
| Demo intake | Verified present | Form and model-context route present; unfinished follow-up copy |
| Dealer locator and dealer contacts | Verified present | Province/list/detail routes; no per-model inventory verified |
| Real-time model-level stock | Unclear / requires direct confirmation | Dealer and importer stock labels exist without proven data provenance |
| Public NL parts EPC/exploded diagrams | Not publicly discoverable | Public route ends at dealer assistance; private system cannot be excluded |
| Public parts request route | Verified present | Dealer locator handoff; dedicated parts order workflow not shown |
| Service calendar booking | Not publicly discoverable | Regional dealer contact route exists |
| NL warranty registration intake | Verified present | Dedicated invoice/serial form; no submission performed |
| Registration extraction and deletion promise | Partially verified | Public control/promise observed; execution not tested |
| Private NL claims/history/portal | Unclear / requires direct confirmation | Public intake is not a private machine ledger or claims system |
| Dealer application intake | Verified present | General contact subject; automation not established |

## Bounded priorities and acceptance evidence

| Priority and reason | Proposed action | Evidence needed to accept completion |
|---|---|---|
| Immediate public accuracy | Replace demo editorial copy with approved owner, response period, location/availability terms and commitment status | Published wording agrees with named importer/dealer routing owner; authorised test lead confirmed |
| Immediate recommendation integrity | Store unknown dimensions explicitly; audit selector matching and displayed counts across branches | All result headings match rendered cards; unknown width cannot be presented as satisfying a restricted opening; tyre-specific data approved |
| Near-term product governance | Reconcile S16 lift/width differences and model variants across Dutch site, price list and importer shop | Product owner signs source/version/units/variant record and publishes applicable distinctions |
| Near-term dealer handoff | Trace model, options, dealer choice and customer consent to recipient and acknowledgement | Authorised test demonstrates payload, unique request ID, recipient, exception queue and measured follow-up; no assumptions from HTML |
| Near-term stock semantics | Distinguish dealer holds stock from exact model/configuration availability | Agreed definition, source owner, timestamp and backorder behaviour; call-to-confirm where unintegrated |
| Discovery before parts development | Demonstrate existing ITL/importer EPC and ordering, then design a serial-led request with optional evidence | Ten actual cases including revision, supersession, engine, backorder and return; licensed data and named operational owner |
| Reuse registration intake | Map existing form to machine record and policy process before building another registration screen | Authorised form walkthrough, invoice access policy, lookup/deletion verification, owner/machine matching and audit log |

These are proposals, not approved scope, promised dates or quantified ROI. A read-only audit cannot establish delivery success, dealer workload or integration cost.

## Material corrections to earlier report

- Replace comparison partially verified/inaccessible with actual populated comparison verified. Preserve the untested browser-persistence qualification.
- Replace uncertainty over a public Netherlands warranty form with dedicated form verified; keep approval, processing and machine history unknown.
- Retain the selector zero-width problem because it was freshly reproduced; add the one-metre branch. Do not present the parsed card-count observation as a completed visual/browser test.
- Add the demo editorial placeholder as current, directly observed evidence of an unclear public handoff promise.
- Treat public stock labels as broad descriptions; avoid describing them as real-time dealer inventory.
- Add product-version reconciliation as a targeted dependency, rather than presenting one published S16 specification as universally authoritative.
