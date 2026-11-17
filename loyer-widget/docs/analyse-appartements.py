# Analyse des annonces d'appartements (atHome, 17/11/2026) : comparaison avec la méthode
# « cadastre des loyers » (analyse-donnees.md) et modèle propre aux annonces.
# Usage : python3 analyse-appartements.py   (lit les CSV du même dossier)
import csv, math, statistics as st, os
here=os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(here,"analyse-maisons.py")).read().split("rows=[]")[0])
CANTON_MED={"Luxembourg":22.22,"Capellen":18.67,"Esch-sur-Alzette":19.12,"Remich":17.86,"Mersch":17.50,"Vianden":17.20,"Grevenmacher":16.27,"Diekirch":16.14,"Wiltz":16.01,"Clervaux":15.56,"Echternach":13.59,"Redange":13.57}
ZONE_MED={"LV":25.56,"LC":22.22,"Peri":18.05,"Sud":19.12,"Est":16.11,"Nord":15.56}
SURF={"LV":[35.0,27.5,22.8,21.3,22.0,20.4],"LC":[31.1,25.4,21.4,19.0,17.5,17.2],"Peri":[28.5,19.5,18.3,17.4,13.6,15.0],"Sud":[26.4,20.0,17.9,16.2,15.5,12.6],"Est":[21.2,18.6,16.5,13.8,13.8,12.1],"Nord":[20.0,17.0,15.1,14.3,12.8,12.8]}
RECENT={"LV":30.00/26.47,"LC":25.38/22.54,"Peri":21.50/18.34,"Sud":22.59/19.39,"Est":19.69/16.82,"Nord":17.76/15.99}
INDEX=206.49/197.79375; MID=[40,60,80,100,120,145]
def surf_m2(z,s):
    v=SURF[z]
    if s<=MID[0]: return v[0]
    if s>=MID[-1]: return v[-1]
    for i in range(5):
        if MID[i]<=s<=MID[i+1]: return v[i]+(s-MID[i])/(MID[i+1]-MID[i])*(v[i+1]-v[i])
def methode(com,s):
    z=zone(com); base=25.56 if com=="Luxembourg" else CANTON_MED[C2K[n(com)]]
    return base*surf_m2(z,s)/ZONE_MED[z]*RECENT[z]*INDEX*s
rows=[]; seen=set()
for r in csv.DictReader(open(os.path.join(here,"annonces-appartements-athome-2026-11-17.csv"))):
    if r["country"]!="LU" or "suspect" in r["flag"]: continue
    rows.append((r["url"],r["rent_eur"],r["surface_m2"],r["locality"],"Appartement"))
for r in csv.DictReader(open(os.path.join(here,"annonces-controle-2026-11-17.csv"))):
    if r["type"] not in ("Appartement","Studio"): continue
    rows.append((r["url"],r["loyer_eur"],r["surface_m2"],r["localite"],r["type"]))
data=[]
for url,l,s,loc,t in rows:
    if url in seen or not s or not l: continue
    seen.add(url); com=commune(loc)
    if com is None: print("inconnu",loc); continue
    s=float(s); l=float(l)
    if s<20 or l<500: continue
    data.append(dict(url=url,l=l,s=s,com=com,z=zone(com),t=t,m=methode(com,s)))
print("appartements retenus",len(data))
zs=["LV","LC","Peri","Sud","Est","Nord"]
def q(v,p): v=sorted(v); return v[min(len(v)-1,int(p*(len(v)-1)+.5))]
print(f"{'zone':6}{'n':>4}{'loyer méd':>10}{'surf méd':>9}{'€/m² méd':>9}{'annonce/méthode':>16}{'P25':>6}{'P75':>6}")
for z in zs+["Tous"]:
    xs=[d for d in data if z=="Tous" or d["z"]==z]
    if not xs: continue
    r=[d["l"]/d["m"] for d in xs]
    print(f"{z:6}{len(xs):4}{st.median(d['l'] for d in xs):10.0f}{st.median(d['s'] for d in xs):9.0f}{st.median(d['l']/d['s'] for d in xs):9.2f}{st.median(r):16.2f}{q(r,.25):6.2f}{q(r,.75):6.2f}")
for lab,lo,hi in [("< 50 m²",0,50),("50-89 m²",50,90),("90-129 m²",90,130),(">= 130 m²",130,9999)]:
    r=[d["l"]/d["m"] for d in data if lo<=d["s"]<hi]
    print(f"  surface {lab:10} n={len(r):3}  annonce/méthode médiane={st.median(r):.2f}")
# modèle des annonces : log(loyer) = a_zone + b log(surface)
X=[[1.0 if d["z"]==z else 0.0 for z in zs]+[math.log(d["s"])] for d in data]; Y=[math.log(d["l"]) for d in data]
k=len(X[0]); M=[[sum(X[i][a]*X[i][b] for i in range(len(X))) for b in range(k)]+[sum(X[i][a]*Y[i] for i in range(len(X)))] for a in range(k)]
for c in range(k):
    p=max(range(c,k),key=lambda r:abs(M[r][c])); M[c],M[p]=M[p],M[c]
    for r in range(k):
        if r!=c: f=M[r][c]/M[c][c]; M[r]=[M[r][j]-f*M[c][j] for j in range(k+1)]
beta=[M[i][k]/M[i][i] for i in range(k)]
res=[Y[i]-sum(X[i][j]*beta[j] for j in range(k)) for i in range(len(X))]
sd=(sum(e*e for e in res)/(len(X)-k))**.5
print("modèle annonces : élasticité surface",round(beta[-1],3),"écart résiduel",round(sd,3),f"(± {round((math.exp(sd)-1)*100)} %)")
for z,a in zip(zs,beta[:-1]):
    print(f"  {z:5} 50 m² {math.exp(a+beta[-1]*math.log(50)):5.0f} €   80 m² {math.exp(a+beta[-1]*math.log(80)):5.0f} €   110 m² {math.exp(a+beta[-1]*math.log(110)):5.0f} €")
print("Dudelange 80 m² : méthode cadastre", round(methode("Dudelange",80)))
