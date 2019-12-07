// constanten
const sp_no = 0; // the isolate or the edge is not part of the mst.
const sp_yes = 1; // the isolate is part of the mst
const rd = 30; // diameter of a isolate

let knopen = []; // contains all the isolate
let edges = []; // contains all the edges
let span_edges = []; // al the edges of the mst. (is a subset of edges)
let backbone = []; // the isolates which form the diagonal in the image
let triangles = []; // the section of the image of a subtree.

let width = 100; // the width of the image for calculation of the object placements.
let height = 100; // the height of the image for calculation  of the object placements
let extrawidth = 50; // the extra width for the legenda.

// the default values for the id's in the html file.
// afmt: distance matrix; svgp: the place to insert the image; clgrp: the colorid's of the isolates.
let params = { afmt: "clustertable", svgp: "svgplaats", clgrp: "clustergroepen" }

// the entry function (onload event of the <body>)
function drawcluster(amatrix, svgplaats, clustergroepen) {
    // Save the values
    params.afmt = amatrix;
    params.svgp = svgplaats;
    params.clgrp = clustergroepen;

    dothedrawing();

} // drawcluster

// Generate the svg outof the html table.
function dothedrawing() {
    let at = getTable();   // fetch the distance table into a 2-d array.
    if (at === null || at.length == 0) { 
        let te = "Error: Distance table not found!!"
        document.getElementById(params.svgp).appendChild(document.createTextNode(te));
        return;
    }
    readTable(at); // translate the 2-d table into nodes (knopen) and link (edges) objects.
    makespanningtree(); // perform  prim's algorithm. 
    longestpad() // generate the longest path of the tree. THis becomes the backbone of thhe imaege.
    minEdges() // add edges which have the minimum distance per isolate making the tee into a network. 
    makeForest(); // generate a subtrees for each isolate of the backbone.
    buildTriangles(); // determine the size of each subtree.
    setXY(); // determine the position of each isolate of the backbone.
    normalize(); // scale the image
    document.getElementById(params.svgp).innerHTML = makesvg(); // insert the image into the html file.

} // dothedrawing

// haal de afstandtabel (en de clustertael) uit de html file. retouneerd een array van arrays.
function getTable() {
    afstandmatrix = [];
    try {
        let am = document.getElementById(params.afmt); // de afstandstabel
        let tb = am.getElementsByTagName("tbody") // de header is niet nodig.
        let rijen = tb[0].getElementsByTagName("tr"); // het begin van de data rijen
        afstandmatrix = []; //
        for (let r = 0; r < rijen.length; r++) {
            let columns = rijen[r].getElementsByTagName("td"); // de data velden
            let afstandrij = [];
            for (let c = 0; c < columns.length; c++) {
                afstandrij.push(columns[c].textContent);
            }
            afstandmatrix.push(afstandrij);
        }
    } catch (error) { console.log(error); return afstandmatrix; };
    if (afstandmatrix.length == 0) return afstandmatrix;
    // voeg de clustergroepen toe aan de afstandmatrix.
    let cols = afstandmatrix[0].length + 1; // wordt het juiste aantal kolommen.
    if (params.clgrp !== undefined) {
        try {
            let am = document.getElementById(params.clgrp);
            let tb = am.getElementsByTagName("tbody");
            let rijen = tb[0].getElementsByTagName("tr")
            if (rijen.length == afstandmatrix.length) {
                for (let r = 0; r < rijen.length; r++) {
                    let columns = rijen[r].getElementsByTagName("td");
                    if (columns.length == 2) {
                        let ind = afstandmatrix.findIndex(ri => ri[0].startsWith(columns[0].textContent));
                        if (ind >= 0) {
                            afstandmatrix[ind].push(columns[1].textContent);
                        }
                    }
                }
            }
        }
        catch (error) { console.log(error) }
    }
    // zorg dat de afstandstabel verder in orde is.
    for (let r = 0; r < afstandmatrix.length; r++) {
        let rij = afstandmatrix[r];
        while (rij.length < cols) {
            rij.push("0");
        }
        if (rij.length > cols) {
            rij.splice(cols, rij.length - cols);
        }
    }
    return afstandmatrix;
} // getTable

// zet de array van arrays om in de objecten knopen en edges en verwijderd 0-entries.
// in dat laatste geval wordt de namen geconcateneerd.
function readTable(at) {
    let cols = at[0].length;
    let rows = at.length;
    for (let r = 0; r < rows; r++) {
        let item = at[r][0].split(".");
        let k = new knoop(r, item[0], item[1]);
        knopen[k.id] = k;
        k.positie = r; // ?
        k.groep = Number(at[r][cols - 1])
    }

    for (let r = 0; r < rows; r++) {
        for (let c = r + 2; c < cols - 1; c++) {
            let id1 = r;
            let id2 = c - 1;
            let nr = Number(at[r][c]);
            knoop.addedge(knopen[id1], knopen[id2], nr);
        }
    }
    zeroCostRemoval();
} // readTable

// 0-entries are removed by concatenating them.
function zeroCostRemoval() {
    edges.forEach((e, ind) => e.id = ind); // de edges krijgen een nummer.
    let zero = edges.findIndex(e => e.cost == 0);
    let olength = edges.length + 1;
    while (zero >= 0 && olength > edges.length) {
        olength = edges.length;
        e = edges[zero];
        let k = e.dest;
        let nid = k.id; // nid is het hogere id van de knoop die we verwijderen
        // remove deze knoop
        knopen[e.source.id].name += "|" + k.name;
        knopen[e.source.id].ra *= 1.5;
        knopen[e.source.id].groep = k.groep;
        k.delete = true;
        k.edges.forEach(ec => {
            ec.delete = true;
            let other = knopen[ec.getOtherId(k.id)];
            other.removeEdge(ec.id);
        });
        // remove de edges
        for (let i = edges.length - 1; i >= 0; i--) {
            if (edges[i].delete) {
                edges.splice(i, 1);
            }
        }
        // hernummer de edges
        edges.forEach((e, ind) => e.id = ind);
        //remove de knoop
        knopen.splice(nid, 1);
        // hernummer de knopen vanaf de delete positie
        for (let i = nid; i < knopen.length; i++) {
            knopen[i].id = i;
        }
        zero = edges.findIndex(e => e.cost == 0);
    }
} // zeroCostRemoval

// Voer het algorithme van Prim uit. 
// De globale variabele span_edges wordt gevuld met de 
// edges die tot de MST behoren. Tevens worden de knoop-property span_edge gevuld.
// De property sp van een edge en een knoop worden door het algorithme onderhouden.
// Dit property staat initieel op sp_no. 
function makespanningtree() {
    let h_edges = edges.slice().sort((a, b) => a.cost - b.cost); // de edges  gesorteerd van lage afstand naar hoge afstand.
    let k = knopen[0]; // de eerste van de spantree
    k.sp = sp_yes; // kenmerk de knoop als onderdeel van een spanningtree
    let index = 0;
    let olength = h_edges.length + 1; // de vorige lengte van h_edges
    let oindex = -1;
    while (index < h_edges.length &&
        (olength > h_edges.length ||
            oindex < index)) { // controle op het afnemen van de h_edges tabel of het toenemen van de index. 
        olength = h_edges.length;
        oindex = index;
        let e = h_edges[index];
        if (e.source.sp == e.dest.sp) { // the status of both isolates are the same.
            if (e.source.sp == sp_yes) { // both are in the mst
                h_edges.splice(index, 1); // remove this edge and continue whith the next.
            } else { // neither of them are currently in the mst 
                index++; // continue whith the next
            }
        } else { // one isolate in the mst, the other not yet.
            k = e.source;
            if (k.sp == sp_yes) k = e.dest; // k holds the non-mst isolate.
            k.sp = sp_yes; // k wijst naar de knoop die in de spanningtree kan worden opgenomen.
            e.sp = sp_yes; // e wijst naar de edge die dat mogelijk maakt.
            span_edges.push(e);
//            e.candidate = false; // 
            e.source.span_edges.push(e); // neem de edge op in de lijst van beide knopen
            e.dest.span_edges.push(e);
            h_edges.splice(index, 1); // remove the edge from the h_edges. 
            index = 0; // search again for the next isolate to put into the mst.
        }
    }
} // makespanningtree

// Look for the longest path.
// Uitgangspunt is knopen en span_edges 
function longestpad() {
    let s = [];
    // zoek de knopen met op 1 na bekende hop buren. 
    // Geef die knopen het maximum hopnr + 1
    spreadInwards();
    // bepaal de 2 grootste hop buren per isolate en
    // de grootste daarvan wordt de start van de gezochte keten.
    let maxhopid = detMaxHop();
    // bepaal nu het hoofdpad: begin bij maxhopid en ga beide kanten uit
    // visited geeft aan of de node al behandeld is.
    calcMainPath(maxhopid);
} // longestpad

function spreadInwards() { // calculate the maximum hops from the leaves to the root.
    // a leave is an isolate with only one edge.
    stack = knopen.filter(n => n.span_edges.length == 1/* && !n.nep*/); // the leaves???!n.nep???
    while (stack.length > 0) {
        let pn = stack.shift();
        if (pn.hop < 0) { // pn.hop is initial -1;
            let m = -1; // wordt de maximum hop voor deze knoop
            let cnt = 0; // aantal knopen nog zonder een hop
            pn.span_edges.map(ed => knopen[ed.getOtherId(pn.id)])//.filter(k => !k.nep)
                .forEach(po => {
                    if (po.hop < 0) {
                        cnt++;
                    } else { // if po.hop
                        m = Math.max(m, po.hop);
                    } //  po.hop
                }); // .forEach
            // the next hop can be caculated when for only one connected hop is not yet defined.
            // the new hop is than the maxmimum hops plus one.
            if (cnt < 2) { // aantal hops<0 mag maximaal 1 zijn
                pn.hop = m + 1; // de hop wordt 1 groter dan het maximum van de verbonden knopen
                pn.span_edges.map(ed => knopen[ed.getOtherId(pn.id)]).//filter(k => !k.nep).
                    forEach(po => {
                        if (po.hop < 0) { // the connected isolate without a hop must go into the stack.
                            stack.push(po); // een verbonden knoop zonder een hop
                        }
                    }); // forEach
            } // if cnt
        } // if pn.hop
    } // while
} // function spreadInwards

// look for the maximum hop.
function detMaxHop() { // wat is de maximale hop en waar staat deze.
    let maxhopid = -1;
    let maxhop = -1;
    knopen.forEach(n => {
        let t = n.span_edges.map(e => knopen[e.getOtherId(n.id)])//.filter(k => !k.nep) // de connected knopen
            .sort((a, b) => b.hop - a.hop) // de grootste hop vooraan
        n.mhopr = t; // bewaar de lijst bij de node
        let ts = t.filter((e, ind) => ind < 2).reduce((a, r) => a + r.hop, 0); // bereken de som van de hops
        if (ts > maxhop) { // bewaar de id met de grootste som
            maxhopid = n.id;
            maxhop = ts;
        }
    });
    return maxhopid;
} // detMaxHop

function calcMainPath(maxhopid) {
    knopen.forEach(n => n.visited = false); // nog geen enkele knoop bezocht
    backbone = []; // this becomes the longest path. 
    backbone.push(knopen[maxhopid]); // de knoop met het hoogste hop nummer komt midden in het pad te staan.
    let n = knopen[maxhopid];
    n.backbone = true; // the isolate is part of the backbone
    let cnt = 0; // veiligheid dat de onderstaande loop zal eindigen.
    let tweemaal = true; // search twice from maxhopid (left and right)
    let busy = true;
    while (busy && cnt < 300) {
        cnt++;
        n.visited = true;
        // n.mhopr is op aflopende volgorde van het hop nummer. Dus de hoogste staat vooraan.
        let mh = n.mhopr.findIndex(h => !knopen[h.id].visited); // de nog niet bezochte knopen
        if (mh < 0) { // niets gevonden: we zijn bij een leave aangeland
            if (tweemaal) {
                n = knopen[maxhopid]; // opnieuw maar nu naar de andere kant
                tweemaal = false; // niet een derde maal
            } else {
                busy = false; // na 2 keer is het genoeg
            }
        } else { // volgende knoop gevonden
            n = n.mhopr[mh];
            //      n.rout = true; // merk de knoop aan als onderdeel van de backbone.
            n.backbone = true; // merk de knoop als onderdeel van de backbone
            if (tweemaal) { // vooraan of achteraan toevoegen
                backbone.push(n);
            } else {
                backbone.unshift(n);
            }
        }
    }
    let hh = backbone.map(r => r.id + "/" + r.name)
    return;
} // calcMainPath

/*
Toevoeging: Een isolate heeft een minimum afstand tot de andere isolates;
Zijn er links van dat isolate met die minimum afstand niet in de mst voorhanden  
worden die alsnog in de MST opgenomen. (daardoor is de MST geen tree meer)
*/
function minEdges() {
    let minclusterdist = knopen.filter(k => !k.nep).map(k => {
        let m = k.edges.reduce((a, e) => Math.min(a, e.cost), Infinity);
        return { k, minste: m };
    });
    //  print(minclusterdist);
    let minclusterfail = minclusterdist.map(ked => {
        let knp = ked.k;
        let m = knp.edges.filter(e => e.cost == ked.minste && e.sp == sp_no && !e.nep);
        return { knp, m }
    }).filter(el => el.m.length > 0);
    //  print(minclusterfail)
    minclusterfail.forEach(el => {
        //    print(el);
        el.m.filter(elm => elm.fake_edge === null).forEach(elm => {
            makeFakeEdge(el.knp, elm)
        })
    })
}

// zet edge ce (vanuit n) om in fake-span-edge. 
function makeFakeEdge(n, ce) {
    let other_id = ce.getOtherId(n.id);
    let other = knopen[other_id];
    //  print("cluster "+n.id+"|"+n.name+" verbinden met "+other.id+"|"+other.name)
    let k = new knoop(knopen.length, other.name, other.eu)
    knopen[k.id] = k;
    k.nep = true; // dit is geen echte knoop
    k.groep = other.groep;
//    ce.candidate = false; // teken dat deze edge een concurrent was.
    let nc;
    if (n.id == ce.source.id) nc = new edge(n, k, ce.cost);
    else nc = new edge(k, n, ce.cost);
    nc.sp = sp_yes; // deze onechte edge is wel een spanningtree edge.
    nc.nep = true;
    nc.orig_edge = ce;
    ce.fake_edge = nc;
    nc.id = edges.length;
    edges[nc.id] = nc;
    //    nn.push(nc); // voeg toe aan de span edges van deze knoop n
    n.span_edges.push(nc)
    span_edges.push(nc); //
    k.span_edges.push(nc);
    n.edges.push(nc);
    k.edges.push(nc);
} // makeFakeEdge

// Maak de boomstructuren vanuit elk backbone cluster
function makeForest() {
    if (backbone.length > 0) {
        for (let i = 0; i < backbone.length; i++) {
            let r = backbone[i]; // een knoop van de backbone
            r.treelevel = 0; // de root van de bomen krijgt treelevel 0. Alle backbone clusters zijn roots.
            buildTree(r);
            GetNbrOfOffspring(r); // vul het aantal nazaten in. 
        }
    }
} // makeForest

function buildTree(k) {
    let se = k.getSpanNeighbours();
    se = se.filter(kk => !kk.backbone);
    k.children = se.slice(); // een copy
    k.children.forEach(ch => {
        ch.parent = k;
    })

    while (se.length > 0) {
        let current = se.shift(); // se wordt als een queue behandeld. Achteraan erin, vooraan eruit.
        current.treelevel = current.parent.treelevel + 1;
        let children = current.getSpanNeighbours();
        children = children.filter(k => k.id != current.parent.id);
        current.children = children.slice();
        children.forEach(ch => {
            ch.parent = current;
            ch.len = current.len;
            se.push(ch);
        })
    }
} // buildTree

function GetNbrOfOffspring(k) {
    if (k.nazaten < 0) {
        k.nazaten = k.children.reduce((a, c) => a + GetNbrOfOffspring(c), 0) + k.children.length;
    }
    return k.nazaten;
}

// combineer verschillende triangles tot 1 triangle.
function combineTriangles(n, trs) { // n is een knoop en trs zijn de triangles van zijn kinderen
    let t = createTriangle(n);
    let ads = trs.reduce((a, el) => a + el.angle, 0) / 2;
    if (trs.length > 0) ads += (trs.length - 1) * 0.01;
    for (let i = 0; i < trs.length; i++) {
        let tr = trs[i];
        t.children.push(tr);
        tr.parent = t;
        let ad = ads - tr.angle / 2;
        rotateTrianglesOmNul(tr, ad);
        ads -= tr.angle + 0.01;
    }
    //    print("comb",n.id,n.nep,trs)
    if (n.backbone)
        t.posP = createmVector(0, 0); // een backbone node heeft geen parent. 
    else
        t.posP = createmVector(0, -n.len);
    t.posL = trs[0].posL.copy();
    t.posR = trs[trs.length - 1].posR.copy();
    t.posK = createmVector(0, 0);
    t.angle = mVector.sub(t.posP, t.posL).angleBetween(mVector.sub(t.posP, t.posR));
    return t;
}

// Maak de triangles vanuit de leaves.
// Lange routine. Besstaat uit de volgende onderdelen:
// Stap 1:Bouw de triangles en maak keuze aan welke kant van de backbone deze komen.
// Stap 2:Eventuele overlappingen zoveel als mogelijk weg werken.
function buildTriangles() {
    // Stap 1:
    knopen.forEach(k => k.triangle = new Array());
    let queue = knopen.filter(k => !k.backbone).sort((a, b) => b.treelevel - a.treelevel) // leaves first
    while (queue.length > 0) {
        let k = queue.shift();
        if (k.children.length == 0) {
            // leaves not backbone leaves
            let t = createTriangle(k);
            t.posL = createmVector(-k.ra * 0.9, k.len); // links van het cluster
            t.posR = createmVector(k.ra * 0.9, k.len); // rechts van ht cluster
            t.posP = createmVector(0, 0);
            t.posK = mVector.add(t.posL, t.posR).mult(0.5); // tussen L en R in. Wordt de clusterplaats
            t.angle = t.posL.angleBetween(t.posR); // hoek vanuit P tussen L en R
        } else {
            // nodes with children not backbone nodes
            let tri = k.children.map(ch => ch.triangle[0]); // de triangles van de kinderen van knoop k.
            let t = combineTriangles(k, tri); // t is de nieuwe omvattende triangle
            translateTriangles(t, createmVector(0, k.len)); // verplaats naar parent van k.
        }
    }
    // nu de backbone
    let hoeken = [1 * Math.PI / 4, 5 * Math.PI / 4]; // takken naar linksboven en rechtsonder
    let bracties = []; // per backbonecluster de children naar links of naar rechts
    let aantalLR = [0, 0]; // houdt bij hoeveel clusters al links en rechts moeten worden getekend.
    backbone.filter(b => b.children.length > 0).forEach(bb => {
        let bbacties = []; // per child de keuze links(=0) of rechts(=1)
        let sa = (keuze, kind) => { // hulp functie
            aantalLR[keuze] += kind.nazaten + 1; // nazaten kind plus kind zelf.
            bbacties.push({ lr: keuze, ch: kind })
        };
        // aantal cluster links en rechts
        bb.children.forEach(ch => {
            if (aantalLR[0] <= aantalLR[1]) {
                sa(0, ch); // save links
            } else {
                sa(1, ch); // save rechts
            }
        })
        bracties.push({ bb, bbacties })
    })
    // behandel en plaats de children volgens de keuzes van bbacties
    bracties.forEach(bract => {
        let bb = bract.bb; // per backbonecluster
        let bbact = bract.bbacties;
        for (let k = 0; k < 2; k++) { // eerst links dan rechts. k is keuze
            let tr = bbact.filter(el => el.lr == k).map(el => el.ch.triangle[0]);
            if (tr.length > 0) {
                let t = combineTriangles(bb, tr);
                rotateTrianglesOmNul(t, hoeken[k]); //3 * PI / 4 ); // draai naar links of rechts
                t.side = k; // geef bij triangle aan bij welke kant hij hoort.  
            }
        }
    });
    // plaats de backbone clusters op hun juiste plaats.(diagonaal linksonder naar rechsboven)
    backbone.forEach((bb, i) => {
        let n = bb.triangle;
        let v = mVector.fromAngle(Math.PI / 4).mult(i); // onder een hoek van 45gr steeds eeen eenheid verder
        for (let r = 0; r < n.length; r++) {
            translateTriangles(n[r], v.copy());
        }
    })
    // Stap 2: 
    // nu overlappingen wegwerken. eerst links dan rechts.
    hoeken = [5 * Math.PI / 4 - Math.PI / 20, -3 * Math.PI / 4 + Math.PI / 20];
    let keuzes = [0, 1]; // Gebruikt in een forloop
    // 3 hulp functies: per keuze (L of R) een andere lijn of hoek.
    GetLijn1 = function (tr, keuze) {
        if (keuze == 0) {
            return { p1: tr.posP, p2: tr.posR };
        } else {
            return { p1: tr.posP, p2: tr.posL };
        }
    }
    GetLijn2 = function (tr, keuze) {
        if (keuze == 0) {
            return { p1: tr.posP, p2: tr.posL };
        } else {
            return { p1: tr.posP, p2: tr.posR };
        }
    }
    HoekPlus = function (hoek, keuze) {
        if (hoek < 0 && keuze == 0) {
            return hoek + 2 * Math.PI; // alleen lnkerkant wanneer hoek in derde kwadrant.
        } else {
            return hoek;
        }
    }
    //    let rtg = function (rtg) { return (180 * rtg / Math.PI).toFixed(2) }
    keuzes.forEach(keuze => {
        let eenkant = []; // de triangles van 1 kant
        backbone.forEach(bb => {
            bb.triangle.filter(tr => tr.side == keuze).forEach(tr => eenkant.push({ bb, tr }));
        })
        let maxhoek;
        if (eenkant.length > 1) {
            let tr1 = eenkant[0].tr;
            let l1 = GetLijn2(tr1, keuze);
            maxhoek = hoeken[keuze] - HoekPlus(mVector.sub(l1.p2, l1.p1).angle(), keuze);
        }
        //        console.log("hk0",rtg(maxhoek));
        for (let i = 0; i < eenkant.length - 1; i++) {
            let tr1 = eenkant[i].tr;
            let tr2 = eenkant[i + 1].tr;
            // check rechts met links volgende
            let l1 = GetLijn1(tr1, keuze);
            let l2 = GetLijn2(tr2, keuze);
            if (snijdenelkaar(l1.p1, l1.p2, l2.p1, l2.p2)) {
                // makkelijke oplossing: verdraai de eerst weg van de tweede
                let hknodig = HoekPlus(mVector.sub(l2.p2, l1.p1).angle(), keuze);
                let hknu = HoekPlus(mVector.sub(l1.p2, l1.p1).angle(), keuze);
                let rot = hknodig - hknu;
                if ((keuze == 0 && rot > maxhoek) ||
                    (keuze == 1 && rot < maxhoek)) {
                    rot = maxhoek;
                }
                rotateTriangles(eenkant[i].tr, l1.p1, rot);
                //                console.log("hk1:",keuze,i,rtg(rot),rtg(hknodig),rtg(hknu),rtg(maxhoek));
            }
            // bepaal maxhoek van i+1
            l1 = GetLijn1(tr1, keuze);
            l2 = GetLijn2(tr2, keuze);
            let ano = HoekPlus(mVector.sub(l1.p2, l2.p1).angle(), keuze);
            let anu = HoekPlus(mVector.sub(l2.p2, l2.p1).angle(), keuze);
            maxhoek = ano - anu; // maximale - hoek nu.
            //            console.log("hk2:",keuze,i+1,rtg(maxhoek),rtg(ano),rtg(anu),l1,l2)
            if ((keuze == 0 && maxhoek < 0) ||
                (keuze == 1 && maxhoek > 0)) {
                // de tweede draaien als er gesneden wordt.
                if (snijdenelkaar(l1.p1, l1.p2, l2.p1, l2.p2)) {
                    rotateTriangles(eenkant[i + 1].tr, l2.p1, maxhoek);
                    //                    console.log("hk3:",keuze,i+1,rtg(maxhoek),"=",rtg(ano),"-",rtg(anu))
                }
                maxhoek = 0;
            }
        }
    });
} // buildTriangles

// Geef de clustes zijn coordinaten. Afstand tussen clusters is 1.
function setXY() {
    backbone.forEach((n, i) => {
        n.ve = mVector.fromAngle(Math.PI / 4).mult(i);
    })
    knopen.filter(k => !k.backbone).forEach(k => {
        let r = k.triangle[0];
        k.ve = createmVector(r.posK.x, r.posK.y);
    })
}

// return true wanneer lijnstuk n1-n2 een cluster snijdt.
function lijnstuksnijdteencluster(n1, n2, clusters) {
    for (let i = 0; i < clusters.length; i++) {
        let bol = clusters[i];
        if (n1.id != bol.id && n2.id != bol.id) {
            let res = lijnsnijdtcircle(n1.ve, n2.ve, bol.ra, bol.ve); // de routine levert snijpunten op.
            for (let j = 0; j < res.length; j++) {
                let sp = res[j];
                if (between(sp, n1.ve, n2.ve)) return true;
            }
        }
    }
    return false;
} // lijnstuksnijdteencluster

// return array van edges die lijnstuk n1-n2 snijden.
function snijdtedges(n1, n2, edges) {
    let result = [];
    let p1 = n1.ve;
    let p2 = n2.ve;
    for (let ind = 0; ind < edges.length; ind++) {
        let edg = edges[ind];
        let ep1 = edg.source.ve;
        let ep2 = edg.dest.ve;
        if (!(n1.id == edg.source.id || n1.id == edg.dest.id ||
            n2.id == edg.source.id || n2.id == edg.dest.id)) { // sla over wanneer de lijnstukken een cluster gemeen hebben.
            if (snijdenelkaar(p1, p2, ep1, ep2)) {
                result.push(edg)
            }
        }
    }
    return result;
} // snijdtedges

// Zorg dat het plaatje binnen de width en height komt te liggen. De maximaal
// mogelijke scale wordt bepaald waarbij de breedte/hoogte ratio behouden blijft.
function normalize() {
    // normalize
    // bepaal de omzettingsformule. Bereken eerst de maximale en minimale x en y waarden.
    let maxx = -Infinity;
    let minx = Infinity;
    let maxy = -Infinity;
    let miny = Infinity;
    for (let i = 0; i < knopen.length; i++) {
        let k = knopen[i];
        if (k.ve == null) {
            print("null:", k.id + "/" + k.name, k.span_edges[0].source.id, k.span_edges[0].dest.id);
        } else { // er wordt extra ruimte gelaten van 0.25 eenheden.
            maxx = Math.max(maxx, k.ve.x + 0.25);
            minx = Math.min(minx, k.ve.x - 0.25);
            maxy = Math.max(maxy, k.ve.y + 0.25);
            miny = Math.min(miny, k.ve.y - 0.25);
        }
    }
    let xoffset = 0;
    let yoffset = 0;
    let mxy = Math.max((maxx - minx), (maxy - miny));
    let sxy = Math.min(width, height);
    fxy = sxy / mxy; // de scale factor.
    // de onzettingsfunctie voor x
    cx = function (xin) {
        return (xin - minx) * fxy - xoffset;
    }
    // de onzettingsfunctie voor y
    cy = function (yin) {
        return height - (yin - miny) * fxy - yoffset;
    }
    xoffset = ((cx(maxx) - cx(minx)) - width) / 2;
    yoffset = (cy(maxy) - cy(miny) + height) / 2;

    // update de x/y coordinaten en de lengtes/diameters.
    for (let i = 0; i < knopen.length; i++) {
        let k = knopen[i];
        if (k.ve != null) {
            k.x = cx(k.ve.x);
            k.y = cy(k.ve.y);
            k.ra = k.ra * fxy;
            k.len = k.len * fxy;
        } else {
            print("fout:", k.id)
        }
    }

    // update de x/y coordinaten van de triangles
    for (let i = 0; i < triangles.length; i++) {
        let t = triangles[i];
        t.lx = cx(t.posL.x);
        t.ly = cy(t.posL.y);
        t.rx = cx(t.posR.x);
        t.ry = cy(t.posR.y);
        t.px = cx(t.posP.x);
        t.py = cy(t.posP.y);
    }

    // bereken de min en max van de afstanden. (t.b.v. de legenda)
    let mind = Infinity;
    let maxd = -Infinity;
    for (let i = 0; i < span_edges.length; i++) {
        let e = span_edges[i];
        e.ra = e.ra * fxy;
        mind = Math.min(mind, e.cost);
        maxd = Math.max(maxd, e.cost);
    }
    // Welke verschillende afstanden zijn er. Er wordt gebruik gemaakt van een Set die de dubbelen verwijderd. 
    let afstandlijst = Array.from(new Set(span_edges.map(e => parseInt(e.cost)))).sort((a, b) => a - b);
    distance = { mind, maxd, afstandlijst };

    // bepaal de minimale afstand vanuit elke node afzonderlijk
    // en kenmerk de edge (lds en ldd) wanneer deze voor de betreffende knoop de minimum afstand heeft.
    nodemin = []; // de minimale afstand tot een andere node
    knopen.filter(k => !k.nep).forEach(k => {
        let m = k.edges.reduce((a, el) => Math.min(a, el.cost), Infinity);
        nodemin.push({ k, m });
        k.edges.filter(e => !e.nep && e.cost == m).forEach(ed => {
            if (k.id == ed.source.id) ed.lds = true;
            if (k.id == ed.dest.id) ed.ldd = true;
        })
    })
    // neem het kenmerk over naar de eventuele nepedge.
    edges.filter(k => k.nep).forEach(e => {
        e.lds = e.orig_edge.lds;
        e.ldd = e.orig_edge.ldd;
    })
    nodemin.sort((a, b) => a.k.name > b.k.name); // sorteer op naam (alfabetisch!!)
}

txtsvg = null; // gaat het object svg bevatten.

function makesvg() {
    txtsvg = new svg();
    // invoeren van stylen
    let sty = '<style type="text/css"><![CDATA[';
    add(sty);
    for (let i = 0; i < distance.afstandlijst.length; i++) {
        let afst = distance.afstandlijst[i];
        let str = mymap(afst, distance.mind, distance.maxd, 1, 0.2).toFixed(2);
        let sty = `.myLine${afst} {stroke-width: ${str}; stroke: black; stroke-linecap: round;} `
        add(sty);
    }
    add(`.myDistText {text-anchor: middle; font-family: Verdana; font-weight: bold; fill: black; } `)
    add(`.myNodeText {text-anchor: middle; font-family: Verdana; font-weight: bold;} `)
    add(`.myLegendeTextL {text-anchor: start; font-family: Verdana; font-weight: bold; fill: black;} `)
    add(`.myLegendeTextR {text-anchor: end; font-family: Verdana; font-weight: bold; } `)
    add(']]></style>')

    // invoeren van de defs
    add('<defs>')
    // de pijlpunten op de edges
    let def = `<polygon points = "${f2(fxy / 5)} ${0} ${f2(fxy / 4)} ${f2(fxy / 30)} ${f2(fxy / 4)} ${-f2(fxy / 30)}"` +
        `fill="#CCCCCC" stroke="#CCCCCC" id="myPijlR" />`
    add(def);
    add('<use href="#myPijlR" id="myPijlL" transform="scale(-1,1)" />');
    // de lijn van knoop naar knoop
    add('<g id="myDefLine" >');
    add(`<line x1="${f2(fxy / 2)}" y1="${0}" x2="${f2(-fxy / 2)}" y2="${0}" />`);
    add(`<circle cx="0" cy="0" r=${f2(fxy / 18)} style="fill: white; stroke:none" />`);
    add("</g>");
    add('<g id="pijltjes" >');
    add(`<polygon points="${f2(-fxy / 25)} ${f2(-2 * fxy / 25)} ${0} ${f2(-4 * fxy / 25)} ${f2(fxy / 25)} ${f2(-2 * fxy / 25)}" ` +
        ` fill="#FF3355" stroke="black" stroke-width="${f2(fxy / 70)}" id="myPijltje1" />`);
    let nbrofpijltjes = 5;
    for (let i = 1; i < nbrofpijltjes; i++) {
        add(`<use href="#myPijltje1" transform="rotate(${i * (360 / nbrofpijltjes)})"/>`)
    }
    add("</g>");
    add('</defs>')

    // de span_edge ljnen incl. midden cirkel, distance en pijlen. 
    for (let i = 0; i < span_edges.length; i++) {
        let e = span_edges[i];
        if (e.nep && !e.draw) continue;
        let van = e.source;
        let naar = e.dest;
        let mx = (van.x + naar.x) / 2;
        let my = (van.y + naar.y) / 2;
        let hoek = createmVector(naar.x - van.x, naar.y - van.y).angle() * 180 / Math.PI; // in graden.
        let scalefactor = 1;
        let trans = `translate(${f2(mx)},${f2(my)}) rotate(${f2(hoek)})`;
        if (e.sp == sp_no) {
            scalefactor = Math.sqrt((van.x - naar.x) * (van.x - naar.x) +
                (van.y - naar.y) * (van.y - naar.y)) / fxy
            trans += ` scale(${f2(scalefactor)},${1})`;
        }
        add(`<use href="#myDefLine" transform="${trans}" class="myLine${e.cost}" />`);
        let tex = `<text x="${f2(mx)}" y="${f2(my + fxy / 30)}" `;
        tex += `class="myDistText" font-size="${f2(fxy / 15)}" >${e.cost}</text>`;
        add(tex);
        add(`<use href="#pijltjes" transform="translate(${f2(mx)},${f2(my)})" ` +
            ` opacity="0"  id="line${e.id}" />`)
        add(`<circle cx="${f2(mx)}" cy="${f2(my)}" r="${f2(fxy / 18)}" ` +
            `onclick="ShowLine('${e.id}')" opacity="0"/>`)
        if (e.ldd) {
            add(`<use href="#myPijlR" transform="${trans}" />`)
        }
        if (e.lds) {
            add(`<use href="#myPijlL" transform="${trans}" />`)
        }
    }
    let kleur = function (groep) {
        var kleuren = ["#FF0000", "#00BB00", "#0000FF", "#00FFFF", "#FFFF00",
                       "#FF00FF", "#FFAA44", "#770077", "#66AABB", "#CCCC44"];
        if (groep > 0 && groep <= kleuren.length) {
            return kleuren[groep - 1];
        } else return "#888888";
    }
    for (let i = 0; i < knopen.length; i++) {
        let k = knopen[i];
        if (k.nep && !k.draw) continue;
        // teken het cluster in de juiste kleur
        let opacity = 1;
        if (k.nep) opacity = 0.5;
        tex = `<circle cx="${f2(k.x)}" cy="${f2(k.y)}" r="${f2(k.ra * 0.5)}" `;
        tex += `opacity="${opacity}" fill="${kleur(k.groep)}" />`
        add(tex);
        let fsi = (fxy / 12.5) * 1.5 // hoogte letter maal 1.5
        if (k.nep || k.groep == 3 || k.groep == 8) {
            let le = ("" + k.name).length * fxy / 15; // schatting van breedte van tekst.
            tex = `<rect x="${f2(k.x - le / 2)}" y="${f2(k.y - fsi / 2)}" width="${f2(le)}" height="${f2(fsi)}" `;
            tex += `opacity="${opacity}" fill="${kleur(k.groep)}" />`;
            add(tex);
        }
        // vul centrum van het cluster met een grijze bol wanneer het een extra bol betreft.
        if (k.nep) {
            add(`<circle cx="${f2(k.x)}" cy="${f2(k.y)}" r="${f2(k.ra * 0.5 * 0.7)}" fill="#888888"/>`)
        }
        // schrijf de naam van het cluster in wit of zwart afh. van de kleur van het cluster
        let kl = "";
        if (k.nep || k.groep == 3 || k.groep == 8) {
            kl = "white"
        } else {
            kl = "black"
        }
        tex = `<text x="${f2(k.x)}" y="${f2(k.y + fsi / 3.5)}" class="myNodeText" `;
        tex += `font-size="${f2(fxy / 12.5)}" fill="${kl}" >${k.name}</text>`
        add(tex)
        add(`<use href="#pijltjes" transform="translate(${f2(k.x)},${f2(k.y)})" ` +
            ` opacity="0"  id="knoop${k.id}" />`)
        add(`<circle cx="${f2(k.x)}" cy="${f2(k.y)}" r="${f2(k.ra)}" ` +
            `onclick="ShowMe('${k.name}')" opacity="0"/>`)
    }

    // de legenda
    let mts = nodemin.reduce((a, el) => Math.max(a, el.k.name.length+2+el.k.eu.length), -Infinity);
    let firstfield = mts * 1.5;
    let legendaXOffset = extrawidth / 20;
    let legendeX = width + legendaXOffset + firstfield;
    let legendeY = 1; // totale hoogte is 100
    let yDist = 2.5; // de regelaftand

    // lijst van clusters en minimale afstand
    legendeY += 3;
    tex = `<text x="${f2(legendeX-firstfield)}" y="${f2(legendeY)}" class= "myLegendeTextL" `;
    tex += `font-size="2.5" >Minimum distance to network</text>`;
    add(tex);
    legendeY += yDist+0.5;
    for (let i = 0; i < nodemin.length; i++) {
        let nm = nodemin[i];
        tex = `<text x="${f2(legendeX)}" y="${f2(legendeY)}" class="myLegendeTextR" `
//        tex += `onclick="ShowMe('${nm.k.name}')" font-size="2" fill="${kleur(nm.k.groep)}" >${nm.k.name}.${nm.k.eu}:</text>`;
        tex += `onclick="ShowMe('${nm.k.name}')" font-size="2" fill="black" >${nm.k.name}.${nm.k.eu}:</text>`;
        add(tex);
        txtsvg.text_anchor = "start"; //textAlign(LEFT, CENTER)
        txtsvg.stroke = "black";
        tex = `<text x="${f2(legendeX + 0.7)}" y="${f2(legendeY)}" class= "myLegendeTextL" `;
        tex += `font-size="2" >${nm.m}</text>`;
        add(tex);
        legendeY += yDist;
    }

    return txtsvg.getsvgtext();
}

