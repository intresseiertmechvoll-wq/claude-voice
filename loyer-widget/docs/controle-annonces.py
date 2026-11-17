# Contrôle de la méthode (analyse-donnees.md, partie 5) contre les annonces du 17/11/2026.
# Usage : python3 controle-annonces.py annonces-controle-2026-11-17.csv
import csv, sys, statistics as st
CANTON = {"Dudelange":"Esch","Bettembourg":"Esch","Mondercange":"Esch","Roeser":"Esch","Esch-sur-Alzette":"Esch","Differdange":"Esch","Sanem":"Esch","Pétange":"Esch","Schifflange":"Esch","Käerjeng":"Capellen","Luxembourg":"LuxVille","Strassen":"LuxCampagne","Ettelbruck":"Diekirch","Colmar-Berg":"Mersch","Diekirch":"Diekirch","Mersch":"Mersch","Lintgen":"Mersch"}
CANTON_MED = {"Esch":19.12,"Capellen":18.67,"LuxVille":25.56,"LuxCampagne":22.22,"Diekirch":16.14,"Mersch":17.50}
ZONE = {"Esch":"Sud","Capellen":"Peri","Mersch":"Peri","LuxVille":"LV","LuxCampagne":"LC","Diekirch":"Nord"}
ZONE_MED = {"LV":25.56,"LC":22.22,"Peri":18.05,"Sud":19.12,"Est":16.11,"Nord":15.56}
SURF = {"LV":[35.0,27.5,22.8,21.3,22.0,20.4],"LC":[31.1,25.4,21.4,19.0,17.5,17.2],"Peri":[28.5,19.5,18.3,17.4,13.6,15.0],"Sud":[26.4,20.0,17.9,16.2,15.5,12.6],"Est":[21.2,18.6,16.5,13.8,13.8,12.1],"Nord":[20.0,17.0,15.1,14.3,12.8,12.8]}
RECENT = {"LV":30.00/26.47,"LC":25.38/22.54,"Peri":21.50/18.34,"Sud":22.59/19.39,"Est":19.69/16.82,"Nord":17.76/15.99}
INDEX = 206.49/197.79375
def cls(s): return 0 if s<50 else 1 if s<70 else 2 if s<90 else 3 if s<110 else 4 if s<130 else 5
MID=[40,60,80,100,120,145]
def surf_m2(z,s):
    v=SURF[z]
    if s<=MID[0]: return v[0]
    if s>=MID[-1]: return v[-1]
    for i in range(5):
        if MID[i]<=s<=MID[i+1]:
            t=(s-MID[i])/(MID[i+1]-MID[i]); return v[i]+t*(v[i+1]-v[i])
INTERP = True
def model(commune,s):
    c=CANTON[commune]; z=ZONE[c]
    sm = surf_m2(z,s) if INTERP else SURF[z][cls(s)]
    return CANTON_MED[c]*sm/ZONE_MED[z]*RECENT[z]*INDEX*s
rows=list(csv.DictReader(open(sys.argv[1])))
out=[]
for r in rows:
    if r["type"]=="Chambre": continue
    s=float(r["surface_m2"]); l=float(r["loyer_eur"]); m=model(r["commune"],s)
    out.append(dict(r,modele=m,ratio=l/m,zone=ZONE[CANTON[r["commune"]]]))
def summ(lab,xs):
    if not xs: return
    rs=sorted(x["ratio"] for x in xs)
    q=lambda p: rs[min(len(rs)-1,int(p*(len(rs)-1)+0.5))]
    within=sum(1 for x in rs if 0.92<=x<=1.08)/len(rs); w15=sum(1 for x in rs if 0.85<=x<=1.15)/len(rs)
    print(f"{lab:38} n={len(rs):3} médiane annonce/modèle={st.median(rs):.2f}  P25={q(.25):.2f} P75={q(.75):.2f}  min={rs[0]:.2f} max={rs[-1]:.2f}  ±8%={within:.0%} ±15%={w15:.0%}")
std=[x for x in out if x["type"] in("Appartement","Studio")]
summ("Tous (appart.+studios)",std)
for z in ["Sud","LV","LC","Peri","Nord"]: summ(" zone "+z,[x for x in std if x["zone"]==z])
summ(" Dudelange",[x for x in std if x["commune"]=="Dudelange"])
summ(" Esch-sur-Alzette",[x for x in std if x["commune"]=="Esch-sur-Alzette"])
summ(" Sud <50 m²",[x for x in std if x["zone"]=="Sud" and float(x["surface_m2"])<50])
summ(" Sud 50-89 m²",[x for x in std if x["zone"]=="Sud" and 50<=float(x["surface_m2"])<90])
summ(" Sud >=90 m²",[x for x in std if x["zone"]=="Sud" and float(x["surface_m2"])>=90])
summ("Penthouse/duplex",[x for x in out if x["type"] in("Penthouse","Duplex")])
print()
for x in sorted(std,key=lambda x:(x["zone"],x["commune"],float(x["surface_m2"]))):
    if x["zone"] in ("Sud",):
        print(f'{x["commune"]:17} {x["type"]:11} {float(x["surface_m2"]):5.0f} m²  annonce {float(x["loyer_eur"]):5.0f} €  modèle {x["modele"]:5.0f} €  ratio {x["ratio"]:.2f}')
