# Analyse des annonces de maisons (atHome + wortimmo, 17/11/2026) : nettoyage, zones, régression log(loyer) ~ zone + log(surface).
# Usage : python3 analyse-maisons.py   (lit les CSV du même dossier, écrit maisons-retenues-2026-11-17.csv)
import csv, json, math, statistics as st, sys, unicodedata
D="/home/user/claude-voice/loyer-widget/docs/"
cant=json.load(open("/home/user/claude-voice/estimation-widget/data/cantons.json"))
def n(s): return unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower().strip()
C2K={n(c):k for k,l in cant.items() if not k.startswith('_') for c in l}
VIL={"senningen":"Niederanven","senningerberg":"Niederanven","wasserbillig":"Mertert","ernzen":"Larochette","moesdorf":"Mersch","eselborn":"Clervaux","alscheid":"Kiischpelt","wilwerwiltz":"Kiischpelt","doncols":"Winseler","grass":"Steinfort","bascharage":"Käerjeng","wahlhausen":"Parc Hosingen","hollenfels":"Helperknapp","howald":"Hesperange","itzig":"Hesperange","bourglinster":"Junglinster","koedange":"Junglinster","holzem":"Mamer","bereldange":"Walferdange","hobscheid":"Habscht","herborn":"Rosport-Mompach","nospelt":"Kehlen","soleuvre":"Sanem","beringen (mersch)":"Mersch","rippig":"Bech","heisdorf":"Steinsel","roodt-sur-syre":"Betzdorf","bridel":"Kopstal","mondorf-les-bains":"Mondorf-les-Bains","grosbous":"Groussbus-Wal"}
def commune(loc):
    l=n(loc)
    if l.startswith("luxembourg"): return "Luxembourg"
    if l in VIL: return VIL[l]
    for c in C2K:
        if c==l: return [x for k,ls in cant.items() if not k.startswith('_') for x in ls if n(x)==c][0]
    return None
ZONE={"Capellen":"Peri","Mersch":"Peri","Esch-sur-Alzette":"Sud","Echternach":"Est","Grevenmacher":"Est","Remich":"Est","Clervaux":"Nord","Diekirch":"Nord","Redange":"Nord","Vianden":"Nord","Wiltz":"Nord"}
def zone(com):
    k=C2K[n(com)]
    if com=="Luxembourg": return "LV"
    if k=="Luxembourg": return "LC"
    return ZONE[k]
rows=[]
for r in csv.DictReader(open(D+"annonces-maisons-athome-2026-11-17.csv")):
    if r["country"]!="LU": continue
    rows.append(dict(src="athome",rent=r["rent_eur"],surf=r["surface_m2"],ch=r["bedrooms"],loc=r["locality"],type=r["type"],url=r["url"],flag=r["flag"]))
for r in csv.DictReader(open(D+"annonces-maisons-wortimmo-2026-11-17.csv")):
    if r["country"]!="LU": continue
    rows.append(dict(src="wortimmo",rent=r["rent_eur"],surf=r["surface_m2"],ch=r["bedrooms"],loc=r["locality"],type="",url=r["url"],flag=""))
seen=set(); data=[]; dup=0; unk=set()
for r in rows:
    com=commune(r["loc"])
    if com is None: unk.add(r["loc"]); continue
    r["commune"]=com; r["zone"]=zone(com)
    key=(com,r["rent"],r["surf"])
    if key in seen: dup+=1; continue
    seen.add(key); data.append(r)
print("inconnus:",unk); print("total LU",len(rows),"doublons",dup,"uniques",len(data))
excl=[]; ok=[]
for r in data:
    if not r["surf"]: excl.append((r,"sans surface")); continue
    s=float(r["surf"]); l=float(r["rent"])
    if r["flag"]: excl.append((r,r["flag"])); continue
    if s>=400: excl.append((r,"surface >= 400 m² (terrain ?)")); continue
    if l/s<10: excl.append((r,"moins de 10 €/m² (à vérifier)")); continue
    r["s"]=s; r["l"]=l; ok.append(r)
print("exclus:"); [print("  ",r["loc"],r["rent"],r["surf"],why) for r,why in excl]
print("retenus",len(ok))
for z in ["LV","LC","Peri","Sud","Est","Nord"]:
    xs=[r for r in ok if r["zone"]==z]
    if xs: print(f"{z:5} n={len(xs):3}  loyer médian={st.median(r['l'] for r in xs):6.0f}  surface médiane={st.median(r['s'] for r in xs):5.0f}  €/m² médian={st.median(r['l']/r['s'] for r in xs):5.2f}")
print("Tous n=",len(ok),"loyer médian",st.median(r['l'] for r in ok),"€/m² médian",round(st.median(r['l']/r['s'] for r in ok),2), "moyenne loyer",round(st.mean(r['l'] for r in ok)))
# régression log(loyer) = a_zone + b*log(surface)
zs=["LV","LC","Peri","Sud","Est","Nord"]
import itertools
X=[];Y=[]
for r in ok:
    X.append([1.0 if r["zone"]==z else 0.0 for z in zs]+[math.log(r["s"])]); Y.append(math.log(r["l"]))
# moindres carrés
k=len(X[0])
XtX=[[sum(X[i][a]*X[i][b] for i in range(len(X))) for b in range(k)] for a in range(k)]
XtY=[sum(X[i][a]*Y[i] for i in range(len(X))) for a in range(k)]
# gauss
M=[row[:]+[XtY[i]] for i,row in enumerate(XtX)]
for c in range(k):
    p=max(range(c,k),key=lambda r:abs(M[r][c])); M[c],M[p]=M[p],M[c]
    for r in range(k):
        if r!=c:
            f=M[r][c]/M[c][c]; M[r]=[M[r][j]-f*M[c][j] for j in range(k+1)]
beta=[M[i][k]/M[i][i] for i in range(k)]
res=[Y[i]-sum(X[i][j]*beta[j] for j in range(k)) for i in range(len(X))]
sd=(sum(e*e for e in res)/(len(X)-k))**.5
print("élasticité surface b =",round(beta[-1],3)," écart-type résiduel =",round(sd,3),"(≈ ±",round((math.exp(sd)-1)*100),"%)")
for z,a in zip(zs,beta[:-1]):
    nz=sum(1 for r in ok if r['zone']==z)
    print(f"  {z:5} n={nz:3}  loyer prédit 150 m² = {math.exp(a+beta[-1]*math.log(150)):5.0f} €   180 m² = {math.exp(a+beta[-1]*math.log(180)):5.0f} €")
w=csv.writer(open(D+"maisons-retenues-2026-11-17.csv","w")); w.writerow(["source","loyer_eur","surface_m2","chambres","localite","commune","zone","type","url"]); [w.writerow([r["src"],r["rent"],r["surf"],r["ch"],r["loc"],r["commune"],r["zone"],r["type"],r["url"]]) for r in ok]
