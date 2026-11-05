from pathlib import Path
import json, re
root = Path(__file__).resolve().parents[1]
sources = []
for name in ['identity_sources.json','benchmark_sources.json','finance_sources.json','main_sources.json','nl_identity_sources.json','nl_journey_sources.json']:
    sources += json.loads((root/'research'/name).read_text(encoding='utf-8-sig'))
source_map = {s['id']:s for s in sources}
counts = len(sources), len({s['url'] for s in sources})

path = root/'Executive_Summary.md'
text = path.read_text(encoding='utf-8')
text = text.replace('The Netherlands already has a guided selector, S26 configurator, price list, dealer information and quote enquiry.', 'The Netherlands already has a guided selector, a verified S26/H26 comparison table, S26 configurator, price list, dealer information, quote/demo enquiry and public warranty-registration form.')
anchor = 'A blanket claim that Solis has no dealer portal is unsupported.'
idx = text.index(anchor)
addition = '''**Fresh Dutch priorities.** The demonstration page contains unfinished instructions about follow-up. A narrow-opening selector result includes records showing zero widths. Registration is public, but its no-plate intake and extension eligibility need a clear distinction. Correct or validate these points with the accountable owners before widening recommendations or automating promises. [Demonstration route](https://www.solistractor.nl/demonstratie/?model=s26), [selector result](https://www.solistractor.nl/keuzehulp/?situation=laden&transmission=shuttle&width=100), [registration](https://www.solistractor.nl/garantieformulier/).

The published roster is 19 dealers and one subdealer, rather than 20 independent wholesale dealer contracts. Generic stock labels are not per-model availability. The proposal must preserve main-dealer/subdealer relationships and obtain authoritative supply data before making commitments. [Dutch network](https://www.solistractor.nl/dealers/).

'''
text = text[:idx]+addition+text[idx:]
path.write_text(text, encoding='utf-8')

path = root/'Research_Methodology_and_Gaps.md'
text = path.read_text(encoding='utf-8')
text = text.replace('The evidence register contains 67 entries representing 62 original URLs.', f'The refreshed evidence register contains {counts[0]} entries representing {counts[1]} distinct original URLs.')
text = text.replace('- Dutch comparison/catalogue and some global pages timed out. A document centre required Google sign-in. The Dutch selector\'s parsed results contained count/width anomalies requiring live-browser retest before calling them product defects.', '- The actual Dutch S26/H26 comparison was retrieved successfully after earlier tool timeouts. The Dutch warranty-registration form was also verified, correcting incomplete earlier coverage. The narrow-opening selector returned records with zero widths; browser layout, all other branches and actual engineering widths were not tested. Some global pages timed out and a document centre required Google sign-in.')
section = '''## Dutch website refresh

The follow-up specifically re-opened solistractor.nl and inspected selection, a populated comparison, configuration and quote forms, demonstration intake, dealer/subdealer directory, parts/service routing, warranty terms, Dutch registration, privacy and the related importer shop. For four material findings, an independent direct public HTTPS retrieval confirmed HTTP 200 and the relevant returned content. No form, lookup, upload, payment or private workflow was executed. The computer-use helper could not establish the browser URL confidently, so native interaction/layout validation did not proceed. These limits do not negate the public page evidence.

Material corrections are explicit in the main report: comparison and Dutch registration are publicly present; machine history and registration processing remain unverified. The demo page's unfinished follow-up copy is an observed content issue. Selector zero widths and cross-channel S16 specifications require product-owner reconciliation. Optional-plate intake versus extension policy may concern different stages and must not be turned into an invented rejection rule. Source access dates do not establish feature deployment dates.

The fresh source records preserve original URLs and distinguish public presence from successful execution. Earlier source limitations superseded by the refresh are identified. Duplicate originals retain research IDs for traceability and are grouped by URL in the report appendix.

'''
text = text.replace('## Access and evidence limits',section+'## Access and evidence limits')
path.write_text(text,encoding='utf-8')

report = (root/'research/report.md').read_text(encoding='utf-8')
part = report.split('## 6 Existing website and digital capability audit\n',1)[1].split('## 7 Dealer ecosystem and customer journeys',1)[0]
part = re.sub(r'<!-- PAGE -->\s*','',part)
def links(match):
    return ', '.join(f"[{ref}]({source_map[ref]['url']})" for ref in match[1].split(','))
part = re.sub(r'\[([IBFM]\d\d(?:,[IBFM]\d\d)*)\]',links,part)
(root/'Netherlands_Website_Research.md').write_text('# Solis Netherlands Website Research\n\nPrepared for Raja and company leadership. Public evidence checked 3 November 2026.\n\n'+part,encoding='utf-8')
print(json.dumps({'source_records':counts[0], 'unique_urls':counts[1], 'dutch_reading_guide':'Netherlands_Website_Research.md'}))
