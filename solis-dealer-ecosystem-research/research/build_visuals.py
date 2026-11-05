from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math, json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'Visual_Assets'; OUT.mkdir(exist_ok=True)
W,H=1600,900
NAVY='#19354C'; TEAL='#087E8B'; PALE='#EDF4F6'; GRAY='#566777'; AMBER='#B36A12'; BLACK='#17242D'; LINE='#CCD7DE'
FONT=Path('C:/Windows/Fonts/arial.ttf'); BOLD=Path('C:/Windows/Fonts/arialbd.ttf')
def f(n=30,b=False): return ImageFont.truetype(str(BOLD if b else FONT),n)
def wrap(s,width,font):
    lines=[]
    for para in str(s).split('\n'):
        line=''
        for word in para.split():
            t=(line+' '+word).strip()
            if d.textlength(t,font=font)>width and line: lines.append(line);line=word
            else:line=t
        lines.append(line)
    return lines
def txt(x,y,s,width=1450,size=30,color=BLACK,b=False):
    for line in wrap(s,width,f(size,b)):
        d.text((x,y),line,font=f(size,b),fill=color);y+=size+9
    return y
def base(title,sub='Proposed design for validation'):
    global im,d
    im=Image.new('RGB',(W,H),'white');d=ImageDraw.Draw(im)
    txt(55,35,title,size=42,b=True);txt(55,95,sub,size=25,color=GRAY)
def save(name,note):
    d.line((55,H-72,W-55,H-72),fill=LINE,width=2)
    txt(55,H-57,note,size=22,color=GRAY)
    # Remove long runs of identical scanlines: blank gaps and unused card padding.
    # Text, borders, arrowheads and chart values retain their original pixels.
    raw=im.tobytes(); stride=W*3; runs=[]; start=0
    for y in range(1,H+1):
        if y==H or raw[y*stride:(y+1)*stride]!=raw[start*stride:(start+1)*stride]:
            length=y-start
            keep=18 if length>=36 else length
            runs.extend([start]*keep if keep<length else range(start,y))
            start=y
    compact=Image.new('RGB',(W,len(runs)),'white')
    compact.frombytes(b''.join(raw[y*stride:(y+1)*stride] for y in runs))
    compact.save(OUT/(name+'.png'),dpi=(240,240))
def box(x,y,w,h,title,body='',accent=TEAL):
    d.rounded_rectangle((x,y,x+w,y+h),12,fill=PALE,outline=LINE,width=2)
    d.rectangle((x,y,x+w,y+7),fill=accent)
    yy=txt(x+22,y+23,title,w-44,30,b=True,color=NAVY)
    if body: txt(x+22,yy+12,body,w-44,27)
def arrow(x1,y1,x2,y2):
    d.line((x1,y1,x2,y2),fill=GRAY,width=4)
    a=math.atan2(y2-y1,x2-x1);q=15
    d.polygon([(x2,y2),(x2-q*math.cos(a-.5),y2-q*math.sin(a-.5)),(x2-q*math.cos(a+.5),y2-q*math.sin(a+.5))],fill=GRAY)
def matrix(name,title,headers,rows,note,widths=None):
    base(title,'Evidence and proposals are separated in the report')
    widths=widths or [1490/len(headers)]*len(headers)
    x=55;y=165;rh=min(112,610/(len(rows)+1))
    for j,h in enumerate(headers):
        d.rectangle((x,y,x+widths[j],y+rh),fill=NAVY,outline='white');txt(x+15,y+15,h,widths[j]-30,27,'white',True);x+=widths[j]
    for i,row in enumerate(rows):
        x=55;y=165+rh*(i+1)
        for j,v in enumerate(row):
            d.rectangle((x,y,x+widths[j],y+rh),fill='white' if i%2 else PALE,outline=LINE)
            txt(x+14,y+13,v,widths[j]-28,25);x+=widths[j]
    save(name,note)

base('01 Executive opportunity overview','Investment sequence depends on evidence and access')
for i,(a,b) in enumerate([
('Verify and reuse','Legal sponsor\nPrivate-system walkthrough\nCatalogue rights and sample data'),
('Connect daily work','Dealer tasks and handoffs\nParts identification\nOnboarding status and access'),
('Add measured assistance','Source-linked answers\nQuote drafts with approved prices\nHuman-approved actions')]):
    box(55+i*510,200,470,410,a,b)
    if i<2:arrow(530+i*510,400,560+i*510,400)
txt(65,665,'Decision now: fund bounded discovery and a measured pilot. Development scope follows the evidence.',1450,32,b=True)
save('01_opportunity','Analyst recommendation | No implementation budget or return is assumed')

base('02 Existing Solis digital ecosystem','Observed public routes and unverified operational handoffs')
box(55,165,430,210,'Solis World','Global product pages\nEU range and country links\nDealer enquiry form')
box(575,165,450,210,'Dutch Solis website','Selector and configurator\nDealer and price tools\nWarranty registration form')
box(1115,165,430,210,'AgriXpert webshop','Tractor listings and prices\nCart and account entry\nCheckout not completed')
arrow(485,270,575,270);arrow(1025,270,1115,270)
box(55,480,430,230,'Customer and local dealer','Discuss use and configuration\nRequest quote or service\nConfirm delivery and support')
box(575,480,450,230,'Importer operations','AgriXpert describes NL role\nParts route via Almere\nERP and contracts unverified')
box(1115,480,430,230,'Private system clues','German dealer login\nUS parts portal described\nNL entitlement unknown',AMBER)
arrow(800,375,800,480);arrow(485,585,575,585)
save('02_existing_ecosystem','Official public pages and country routes | Login clues do not verify Dutch access')

matrix('03_dealer_journey','03 Dealer journey and validation needs',
 ['Stage','Observed touchpoint','Hypothesis to test','Proposed response'],[
 ['Discover','Selector and model pages','Repeat requirement capture','Save requirements to lead'],
 ['Quote','Configured enquiry','Rekeying or price checks','Versioned quote workspace'],
 ['Deliver','Dealer handoff','Registration fragmentation','Machine record and checklist'],
 ['Maintain','Dealer service route','Parts identification delays','Serial and diagram workflow'],
 ['Expand','Dealer interest form','Approval status chasing','Tracked approval and training']
 ],'Solis workflow hypotheses require dealer observation | No interviews claimed',[210,410,430,440])

matrix('04_workstreams','04 Four workstreams and investment tests',
 ['Workstream','User result','Critical dependency','First measurement'],[
 ['Dealer Portal','One queue for daily work','Existing portal and DMS scope','Task time and adoption'],
 ['Parts Intelligence','Correct part with evidence','Licensed serial fitment data','Identification and return rate'],
 ['Agentic Commerce','Useful answer and handoff','Authoritative source access','Accuracy and qualified leads'],
 ['Dealer Onboarding','Approved and ready dealer','Contract authority and roles','Ready-for-first-order time']
 ],'Proposed capability model | Priority reflects dependencies, not a fabricated score',[290,400,430,370])

matrix('05_benchmarks','05 Official benchmark capabilities',
 ['Platform','Verified public description','Lesson for Solis','Boundary'],[
 ['Deere','Parts lookup and service data','Connect machine to parts','Market and login vary'],
 ['CNH','Catalogues and diagrams','Fitment before ordering','Check serial coverage'],
 ['AGCO','Tech Connect dealer workflow','Mobile service evidence','No Solis transfer implied'],
 ['Kubota Europe','SSO technical and parts tools','Reuse connected systems','Permissions by role'],
 ['Solis regions','German login US portal claim','Inspect existing assets first','NL access remains open']
 ],'Official manufacturer documentation | Full evidence and market limits in report',[250,490,400,350])

base('06 AGCO tractors and replacement parts','Audited consolidated product revenue | USD millions | Peer evidence only')
years=[2023,2024,2025];tot=[14412.4,11661.9,10082.0];parts=[1816,1827.8,1873.3];tract=[8711.0,7059.3,6693.0]
for k,(year,total,pa,tr) in enumerate(zip(years,tot,parts,tract)):
    yy=205+k*165
    txt(55,yy+25,str(year),110,32,b=True)
    maxw=1060; bx=210
    for value,col in [(tr,NAVY),(pa,TEAL),(total-tr-pa,'#C3D0D8')]:
        ww=value/14412.4*maxw;d.rectangle((bx,yy,bx+ww,yy+70),fill=col);bx+=ww
    txt(210,yy+83,f'Total {total:,.1f} | Replacement parts {pa:,.1f} | Parts share {pa/total:.1%}',1310,28)
for x,c,l in [(220,NAVY,'Tractors'),(600,TEAL,'Replacement parts'),(1130,'#C3D0D8','Other')]:
    d.rectangle((x,740,x+24,764),fill=c);txt(x+40,734,l,380,26)
save('06_financial_mix','AGCO annual report 2025 revenue note | Other includes other product categories; not Solis mix')

base('07 Integrated architecture','Proposed logical design | External systems and ownership require confirmation')
layers=[('Experience','Public model discovery  |  Dealer workspace  |  Parts counter  |  Onboarding'),
('Business workflows','Leads and quote approval  |  Service and parts requests  |  Dealer authorization'),
('Shared data','Product and fitment  |  Dealer and roles  |  Customer and machine  |  Event history'),
('Controlled integration','Identity checks  |  Versioned APIs or approved imports  |  Audit and reconciliation'),
('External records','ITL catalogues  |  Importer ERP and WMS ?  |  Dealer DMS ?  |  Training and signing ?')]
for i,(a,b) in enumerate(layers):
    yy=155+i*125
    d.rectangle((55,yy,1545,yy+98),fill=PALE,outline=LINE,width=2)
    txt(76,yy+17,a,320,29,b=True,color=NAVY);txt(420,yy+22,b,1090,27)
    if i<4:arrow(800,yy+100,800,yy+122)
save('07_architecture','? = unverified system | AI receives authorized views and approved actions, not unrestricted records')

base('08 Dealer Portal information architecture','Proposed navigation organized around dealer work')
box(55,170,1490,100,'Dealer workspace','')
cats=[('Today','Tasks\nMessages\nApprovals'),('Sell','Leads\nConfigurations\nQuotes and orders'),('Support','Machines\nService cases\nParts and returns'),('Enable','Training\nDocuments\nOnboarding and roles')]
for i,(a,b) in enumerate(cats):
    xx=55+i*380;arrow(xx+175,270,xx+175,345);box(xx,350,350,350,a,b)
save('08_portal_ia','Proposed IA | Integrate existing capabilities behind common navigation where permitted')

base('09 Parts Intelligence journey','Identification must establish fitment before a purchase request')
steps=[('Identify machine','Serial or nameplate\nEngine identity if relevant'),('Find candidate','Model and build range\nDiagram and source'),('Verify fitment','Supersession and quantity\nExpert if ambiguous'),('Confirm supply','Authorized price and stock\nTimestamp and promise'),('Approve and learn','Dealer approves order\nInstall and capture return')]
for i,(a,b) in enumerate(steps):
    xx=55+i*300;box(xx,245,275,380,a,b)
    if i<4:arrow(xx+278,430,xx+297,430)
save('09_parts_journey','Proposed journey | Image matching supplies candidates only; no invented fitment')

base('10 Agentic Commerce and approval flow','Illustrative conversation | No real model recommendation or commercial promise')
box(55,170,700,145,'Customer','I need a tractor for mowing and moving material on narrow paths.')
box(55,345,700,220,'Assistant','Confirm path width, implement needs and terrain. Retrieve current market specifications and explain candidate differences with sources.')
box(55,600,700,155,'Customer','Ask my local dealer to review this shortlist and prepare a quote.')
box(870,170,670,160,'Authorized read','Market catalogue and sources\nDealer territory and consent')
box(870,365,670,160,'Draft and validate','Check configuration and pricing rules\nSave context to selected dealer')
box(870,560,670,195,'Dealer approval before send','Approve price and commitments\nRecheck stock and validity\nLog who approved and what changed',AMBER)
arrow(755,455,870,455);arrow(1200,330,1200,365);arrow(1200,525,1200,560)
save('10_agent_flow','Proposed guarded workflow | Orders warranty decisions and credit changes require authorized approval')

base('11 Dealer onboarding process','Proposed process with named decision owners')
steps=[('Apply','Dealer','Company territory\nWorkshop capability'),('Qualify','Network lead','Market review\nEvidence checklist'),('Approve','Commercial teams','Service parts finance\nContract authority'),('Enable','Admin and trainer','Signed agreement\nRole access and training'),('Activate','Account owner','First-order rehearsal\nSupport contacts and review')]
for i,(a,b,c) in enumerate(steps):
    xx=55+i*300;box(xx,210,275,460,a,b+'\n\n'+c)
    if i<4:arrow(xx+278,430,xx+297,430)
save('11_onboarding','Form submission does not activate a dealer | Every approval records owner evidence and timestamp')

matrix('12_roadmap','12 Phased roadmap with decision gates',
 ['Phase','Deliverable','Gate to continue','Scope limit'],[
 ['Discovery','System walkthrough and baseline','Authority data and pilot access','No rebuild commitment'],
 ['Connected pilot','Tasks parts lookup onboarding','Measured workflow improvement','NL sample and bounded models'],
 ['Operational rollout','Approved quote and order links','Reconciliation and support ready','Human approved writes'],
 ['Market reuse','Configurable importer policies','Second market proves reuse','Separate legal and catalogue rules']
 ],'Sequence is proposed | Calendar and cost require scoped integration evidence',[240,450,480,320])

matrix('13_risks_gates','13 Risks dependencies and decision gates',
 ['Risk','Dependency','Decision gate','Accountable owner'],[
 ['Wrong contracting entity','Legal and registry evidence','Named sponsor and controller','Executive sponsor'],
 ['Duplicate existing system','Private portal walkthrough','Reuse or replace decision','ITL and importer IT'],
 ['Incorrect parts','Licensed serial fitment rules','Reviewed fitment test set','Parts lead'],
 ['Stale commercial promise','ERP stock and price feeds','Freshness and reconciliation','Operations lead'],
 ['Unauthorized AI action','Identity and approval policy','Access and failure tests','Product and security']
 ],'Proposed governance | Risk controls must be tested against real records',[320,430,450,290])

matrix('14_kpi_value','14 KPI and business value model',
 ['Outcome','Measurement','Value formula','Control'],[
 ['Dealer productivity','Median active task minutes','Tasks x minutes saved / 60','Observe same task mix'],
 ['Correct part first time','Fitment-related return rate','Orders x rate reduction x cost','Separate other returns'],
 ['Lead conversion','Qualified lead cohort wins','Leads x incremental win x margin','Avoid attribution overlap'],
 ['Onboarding efficiency','Time to ready for first order','Cases x admin hours saved','Exclude dealer waiting time'],
 ['Assistant quality','Grounded correct answer rate','Measured benefit less run cost','Track harmful errors too']
 ],'Proposed measurement | Baselines unknown; time saved is capacity unless cash costs fall',[320,400,470,300])

def interface(name,title,parts=False):
    base(title,'Illustrative wireframe | No real dealer records parts prices or stock')
    d.rectangle((55,155,1545,765),fill='white',outline=LINE,width=3)
    d.rectangle((55,155,350,765),fill=NAVY)
    txt(78,180,'DEALER WORKSPACE',240,26,'white',True)
    for i,a in enumerate(['Today','Sell','Machines','Parts','Service','Training','Administration']):txt(82,250+i*65,a,240,27,'white')
    if parts:
        txt(390,185,'Find parts for a verified machine',1100,33,b=True)
        d.rectangle((390,250,1500,320),outline=LINE,width=2);txt(410,264,'Enter serial or choose model and production range',1050,28,color=GRAY)
        box(390,360,510,265,'Catalogue view','Select a verified diagram\nNo assembly shown until a\nlicensed catalogue is loaded')
        box(940,360,560,265,'Candidate and fitment','Source revision: required\nSerial coverage: unresolved\nPrice and stock: unavailable',AMBER)
        txt(395,665,'Request parts expert review  >  Confirm fitment  >  Prepare order',1110,28,b=True)
    else:
        txt(390,185,'Today and pending work',1100,34,b=True)
        for i,(a,b) in enumerate([('Configured enquiry','Review requirements and choose next action'),('Parts request','Machine identity needs confirmation'),('New dealer application','Workshop evidence awaiting service review')]):
            yy=270+i*140;d.rectangle((390,yy,1500,yy+110),fill=PALE,outline=LINE);txt(410,yy+15,a,1050,29,b=True);txt(410,yy+55,b,1050,27)
    save(name,'Proposed screen | Permission and freshness checks precede commercial commitments')
interface('15_portal_wireframe','15 Dealer Portal task workspace')
interface('16_parts_wireframe','16 Parts Intelligence example interface',True)
base('17 Parts ecosystem and record ownership','Proposed integration map | Existing source systems and licences must be verified')
box(55,175,430,205,'ITL and catalogue owner','Build records and serial ranges\nPart master and supersessions\nLicensed diagram revisions')
box(585,175,430,205,'Component rights holder','Engine model and serial\nApproved component catalogue\nExplicit data-use permission')
box(1115,175,430,205,'Importer and warehouse','Price entitlement and stock\nOrder acknowledgement\nFulfilment and returns')
for xx in [270,800,1330]:arrow(xx,380,xx,465)
box(55,470,1490,125,'Authorised parts desk','Machine identity  >  Candidate and evidence  >  Fitment review  >  Approved supply request')
arrow(800,595,800,655)
box(55,660,1490,125,'Dealer workshop and owner','Install against work order  |  Record outcome and return reason  |  Improve source data through review')
save('17_parts_ecosystem','Proposed boundaries | A partner relationship does not grant catalogue redistribution or AI rights')
base('18 Titan Machinery revenue and gross profit','FY ended 31 January 2026 | Dealer group peer evidence only')
cats=['Equipment','Parts','Service','Rental / other'];cols=[NAVY,TEAL,'#6995A9','#CDD7DF']
for yy,label,vals,total in [(245,'Revenue',[1774.535,428.261,177.910,46.401],2427.107),(475,'Gross profit',[129.330,132.515,109.459,11.252],382.556)]:
    txt(55,yy-55,label,1450,33,b=True)
    xx=55
    for val,col in zip(vals,cols):
        width=1490*val/total;d.rectangle((xx,yy,xx+width,yy+95),fill=col)
        if width>105:txt(xx+12,yy+30,f'{val/total:.1%}',width-20,28,'white' if col!='#CDD7DF' else BLACK,True)
        xx+=width
txt(55,645,f'Parts + service: {(428.261+177.910)/2427.107:.2%} of revenue and {(132.515+109.459)/382.556:.2%} of gross profit.',1480,34,b=True)
for i,(cat,col) in enumerate(zip(cats,cols)):
    xx=55+i*390;d.rectangle((xx,740,xx+24,764),fill=col);txt(xx+38,734,cat,345,26)
save('18_titan_mix','Titan Machinery FY2026 10-K | Gross profit precedes operating expense; not Solis margins')

base('19 Dutch public journeys and next evidence','Observed website touchpoints | Questions concern the operational handoff')
for x,title,body in [
    (55,'Choose a tractor','Observed\nGuided selector\nCompare model choices\nOptions and price list\n\nVerify next\nConsistent specifications\nSaved configuration'),
    (435,'Contact a dealer','Observed\n19 dealers 1 subdealer\nDemo and enquiry forms\n\nVerify next\nAssigned lead owner\nAcknowledgement\nResponse responsibility'),
    (815,'Register a machine','Observed\nDutch warranty form\nSerial and dealer fields\nInvoice upload\n\nVerify next\nEligibility decision\nReceipt and case status'),
    (1195,'Request support','Observed\nDealer service route\nModel serial and hours\nAlmere parts route claim\n\nVerify next\nLicensed parts fitment\nSupply acknowledgement')
]:
    box(x,165,350,600,title,body)
save('19_dutch_public_journeys','Source dated 3 November 2026 | No form submission or private workflow tested')
print('Created',len(list(OUT.glob('*.png'))),'visual assets')
