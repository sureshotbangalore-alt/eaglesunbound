from pathlib import Path
import json, zipfile, re

root = Path(__file__).resolve().parents[1]
backup = root / 'research/QA/before_dutch_site_refresh.zip'
if not backup.exists():
    with zipfile.ZipFile(backup, 'w', zipfile.ZIP_DEFLATED) as z:
        for name in ['Solis_Dealer_Ecosystem_Research_Report.docx', 'Solis_Dealer_Ecosystem_Research_Report.pdf', 'Source_Register.csv', 'Executive_Summary.md', 'Research_Methodology_and_Gaps.md', 'research/report.md']:
            z.write(root / name, name)

sources_path = root / 'research/main_sources.json'
sources = json.loads(sources_path.read_text(encoding='utf-8-sig'))
sources = [s for s in sources if s['id'] != 'M12']
sources.append(dict(id='M12', title='Actieprijzen', publisher='Solis Nederland / AgriXpert',
    url='https://www.solistractor.nl/acties/', publication_date='', access_date='2026-11-03',
    classification='Verified', claim='Published S50 loader package prices and unspecified promotion validity',
    evidence='Opened package table: tractor EUR 21,725, loader EUR 4,995, mounting EUR 650, total EUR 27,370 excluding VAT; page asks dealer to confirm active period',
    limitations='Public indicative prices, not dealer net prices, a binding quote or proof of current stock; publication date not stated'))
sources_path.write_text(json.dumps(sources, indent=2, ensure_ascii=False), encoding='utf-8')

identity_path = root / 'research/identity_sources.json'
sources = json.loads(identity_path.read_text(encoding='utf-8-sig'))
for s in sources:
    if s['id'] == 'I25':
        s['limitations'] = 'Initial pass did not identify NL registration. This limitation is superseded by current public-form verification I31 and I32; no submission or approval tested.'
identity_path.write_text(json.dumps(sources, indent=2, ensure_ascii=False), encoding='utf-8')

path = root / 'research/report.md'
text = path.read_text(encoding='utf-8')
text = text.replace('Global brand and European market research with a Netherlands operating focus', 'Global and European evidence with a detailed audit of solistractor nl')
text = text.replace('**Existing capabilities.** Dutch selection, configuration, pricing and dealer enquiries already exist; AgriXpert also offers tractor purchase entry. Improve their handoff before funding replacements. [I07,I08,I09]', '**Existing capabilities.** The fresh Dutch audit verifies selection, an actual comparison table, configuration, dealer/demo enquiries and a public warranty-registration form. AgriXpert also offers tractor purchase entry. Reuse these capabilities and test their operational handoff. [I07,I08,I09,I31,B21]')
text = text.replace('**Opportunity hypothesis.** Connect configured enquiries, dealer response, machine identity and correct-part fulfilment. Share permissions and records across onboarding and support. Measure local benefit; no dealer interviews or private-system tests were conducted.', '**Immediate Dutch priorities.** Resolve the published demo follow-up placeholder, investigate zero-width selector results and align registration guidance. Then test enquiry ownership, machine identity and correct-part fulfilment with dealers. These specific findings support a bounded pilot; no dealer interviews or private-system tests were conducted. [B22,B23,I31,I32]')
text = text.replace('**Investment alternatives.**', '**Dutch website corrections before a pilot.** The demonstration page leaves the follow-up owner and timing unresolved in visible editorial copy. The selector can include records with 0 cm widths in a narrow-opening result. Warranty intake already exists and should be reused; its registration and extension rules need reconciliation. Fix or validate these issues with the responsible owners before adding conversational recommendations. [B22,B23,I31,I32]\n\n**Investment alternatives.**', 1)
text = text.replace('The Netherlands selector was followed through successive requirement choices; model, price list, importer product, service and dealer pages were inspected.', 'The Netherlands selector was followed through successive requirement choices, including a narrow-opening branch. An actual two-model comparison, the demonstration route, warranty form, model options, price list, importer listing, service and dealer pages were inspected. The Dutch site was rechecked specifically for this edition; access date does not establish when a feature was launched.')

start = text.index('### Journeys actually inspected')
end = text.index('![Existing Solis ecosystem]', start)
text = text[:start] + '''### Dutch website findings and their business implications

The Netherlands website is an operating customer touchpoint, not simply a brochure. The public journey combines model discovery, requirements filtering, comparison, indicative configuration prices, regional dealers, demonstration requests and warranty intake. The refresh corrects the earlier audit's incomplete comparison and Dutch registration coverage. It verifies public presence, while leaving transaction delivery and private workflows separate. [I31,I38,B21,B24]

**Network scope.** The site lists 19 dealers and one subdealer, consistent with the homepage's 20 sales/service points. Romox is identified under van Vijfeijken, without its own tractor stock. This is a published roster, not proof of 20 independent dealer contracts. Proposed lead routing and account permissions must support that main-dealer/subdealer relationship. Confirm the active contractual roster and service authority before provisioning accounts. [I38,I39]

**Tractor discovery and comparison.** The selector was followed through loading, repeated forward/reverse and width choices. A narrower-than-one-metre branch returned models whose parsed widths were 0 cm; a second branch showed a heading/card-count discrepancy. These are reproducible page-data flags, not measured tractor widths. Unknown dimensions should require confirmation before a model is represented as meeting a physical constraint. The actual S26/H26 comparison table now loads and includes technical categories and explicit missing-value labels. Previous comparison timeouts must not be described as an absent capability. [B21,B22]

**Configuration and enquiries.** The S26 page exposes options and dependency guidance with indicative prices and dealer-selected enquiry. The fresh check also inspects demonstration intake. Form presence, fields and source model context can be verified; acknowledgement, received configuration, assignment, response times and CRM integration require a controlled test. Public contact routes do not demonstrate manual back-office work. [I08,B23,B24]

**Demonstration content defect.** The public demonstration page displays unfinished instructions asking for a follow-up owner, response timing and commercial conditions. This leaves the next step unclear to a customer. The importer should replace that text with an agreed service promise and test a received request through its responsible dealer. The finding concerns published content; no failed delivery is alleged. [B23]

**Prices and commercial authority.** The S50 promotion page publishes EUR 21,725 for the tractor, EUR 4,995 for the loader and EUR 650 for mounting, totalling EUR 27,370 excluding VAT. It explicitly leaves the promotion's active period for dealer confirmation. These are indicative retail amounts, not turnover, dealer margin or a binding current quote. A future assistant or quote draft must retain price-list version, included options, installation, tax, validity and commercial approval. [M12,I18]

**After-sales and existing registration.** Dutch service directs owners to dealers with machine identity and hours. Warranty and service pages lead to a Dutch registration form with owner, dealer, serial, purchase and invoice evidence. Registration intake is verified; processing, activation and a complete machine history remain unknown. Reuse this route before building another form, and ask the warranty owner to demonstrate acknowledgement and exception handling. The displayed lookup and photo-deletion descriptions do not establish extraction accuracy or actual deletion. [I31,I32,I33]

**Importer commerce and shared data.** AgriXpert offers a separate tractor purchase route. The refresh identifies differing S16 lifting/width descriptions across Dutch discovery and importer content; configuration or revision differences may explain them and must be checked. Do not choose an authoritative value by guesswork. Identify a market/model/variant master and feed consistent facts into selector, comparison, configuration, shop and future assistant. [I09,B25]

![Existing Solis ecosystem]''' + text[end+len('![Existing Solis ecosystem]'):]

text = text.replace('| Tractor comparison | Partially verified | Links found; final comparison repeatedly timed out |', '| Tractor comparison | Verified present | Actual S26/H26 comparison table inspected; earlier timeout limitation superseded [B21] |')
text = text.replace('| Dealer locator and dealer information | Verified present | Dutch province/location list [I15] |', '| Dealer locator and dealer information | Verified present | 19 dealers and one subdealer; published roster and relationship [I38,I39] |')
text = text.replace('| Enquiries and quote requests | Verified present | Dealer-selected public form [I08] |', '| Enquiries quote and demo requests | Verified present | Dealer-selected forms; response and delivery untested [I08,B23,B24] |')
text = text.replace('| Saved or shared configurations | Not publicly discoverable | Persistence and structured dealer transfer require demonstration |', '| Saved or shared configurations | Unclear / requires direct confirmation | Comparison selection persistence is described; full configuration sharing and dealer transfer remain unverified [B21,B24] |')
text = text.replace('| Warranty registration | Partially verified | Germany form; NL workflow untested [I24] |', '| Warranty registration intake | Verified present | Dutch owner dealer machine and invoice form; processing not tested [I31,I32] |')
text = text.replace('| Machine registration and history | Not publicly discoverable | Warranty form does not establish a machine ledger |', '| Machine registration intake | Verified present | Public Dutch warranty form collects machine identity [I31] |\n| Machine ledger and service history | Unclear / requires direct confirmation | Public intake does not establish an accessible machine record or history |')

anchor = '**Interpretation.** A configured form and an ecommerce cart solve only parts of the lifecycle.'
idx = text.index(anchor)
new = '''### Priority actions from the Dutch audit

These priorities are analyst recommendations based on the public evidence. Priority describes the order of validation and correction, not a quantified return or an agreed delivery schedule.

| Priority and finding | Recommended action and proposed owner | Evidence required to close |
|---|---|---|
| First Demo follow-up copy remains unfinished [B23] | Importer sales and website owner agree recipient, acknowledgement and response responsibility | Approved copy plus an authorised test received by the correct person |
| First Selector accepts zero-width records [B22] | Product data owner tests width filters and prevents unknown dimensions from implying fit | A reviewed test set with known widths and unknown-value cases |
| First Warranty guidance has unresolved conditions [I31,I32] | Warranty owner separates intake, provisional registration, extension approval and claims | Confirmed policy and tests for no plate, missing evidence and correction |
| Next Specifications differ across channels [B25] | Product and commerce owners reconcile variant and source revisions | Signed-off data record used consistently by discovery and shop |
| Next Current pricing and supply need authority [M12,I38] | Commercial and parts owners define validity, stock timestamps and dealer entitlements | One approved quote and one acknowledged parts request traced to source |

The warranty form says an owner may leave the licence plate blank while the extension page describes a valid Dutch plate condition. These may concern different stages; the distinction needs clarification rather than an assumed rejection rule. The form also describes HEIC uploads while its public file-input acceptance list differs. Confirm supported formats through an authorised acceptance test. Neither observation proves that submitted registrations fail. [I31,I32]

### Consequences for the four workstreams

| Workstream | Dutch evidence changes the proposed scope | First demonstration to request |
|---|---|---|
| Dealer Portal | Reuse public enquiry demo and registration routes; show their next action in one workspace | Follow a consented enquiry from model selection to dealer receipt and response |
| Parts Intelligence | Dealer-assisted identification and Almere route are published; catalogue access is still a dependency | Trace a real serial to an approved part and supply acknowledgement |
| Agentic Commerce | Selector comparison options and prices already provide discovery; data quality must be resolved before AI advice | Answer reviewed tasks with model variant sources unknown values and dealer escalation |
| Dealer Onboarding | Public dealer-interest intake exists; main/subdealer roles need distinct entitlements | Show one applicant through agreement training first-order access and suspension |

![Dutch public journeys and operational evidence](Visual_Assets/19_dutch_public_journeys.png)

'''
text = text[:idx] + new + text[idx:]
text = text.replace('Registration and PDI | Missing handover records | Reuse first; machine and warranty ownership confirmed', 'Registration and PDI | Missing handover records | Reuse Dutch intake first; record ownership and processing demonstrated [I31]')
text = text.replace('The Dutch dealer-interest route is a contact form.', 'The Dutch dealer-interest route is a contact form, separate from the warranty-registration form. The directory also distinguishes one subdealer under a main dealer, so applicant status should not automatically confer wholesale or warranty rights. [I31,I38]')
text = text.replace("Its consolidated operating income increased 5.66%", "ICRA uses operating income as a revenue measure here, not operating profit; PAT means profit after tax. Its consolidated operating income increased 5.66%")
text = text.replace('Operating income / PAT |', 'Revenue labelled operating income / PAT |')
text = text.replace('The Netherlands selector\'s parsed results contained count/width anomalies requiring live-browser retest before calling them product defects.', 'The Netherlands selector\'s parsed results contained count/width anomalies; targeted current findings and acceptance tests are recorded in section 6.')
# Match the final source IDs assigned by the independent Dutch journey review.
refmap = {'B21':'B26', 'B22':'B25', 'B23':'B28', 'B24':'B27', 'B25':'B35'}
text = re.sub(r'\[([IBFM]\d\d(?:,[IBFM]\d\d)*)\]', lambda m: '[' + ','.join(refmap.get(r, r) for r in m[1].split(',')) + ']', text)
path.write_text(text, encoding='utf-8')
print('Updated Dutch audit and source corrections')
