function mymap(w, li, hi, lu, hu) {
    return (hu - lu) * (w - li) / (hi - li) + lu;
}

function vt(v) {
    return "(" + v.x.toFixed(3) + "," + v.y.toFixed(3) + ")"
}
// De triangle functies
// rotate 1 trainangle om een een pointer
function rotateom(vec, rotpoint, hoek) {
    let h1 = mVector.sub(vec, rotpoint);
    let h2 = h1.rotate(hoek);
    let h3 = h2.add(rotpoint);
    return h3;
}

// rotate een vectorcopy om een hoek. 
function rotateomnul(vec, hoek) {
    return createmVector(vec.x, vec.y).rotate(hoek);
}

// rotate een triangle en al zijn nazaten om een pointer 
function rotateTriangles(r, rotpoint, hoek) {
    let q = [r];
    while (q.length > 0) {
        rq = q.pop();
        //        print("rotate:",rq.id,rq.node.id,(180*hoek/PI).toFixed(2));
        rq.posL = rotateom(rq.posL, rotpoint, hoek);
        rq.posR = rotateom(rq.posR, rotpoint, hoek);
        rq.posP = rotateom(rq.posP, rotpoint, hoek);
        rq.posK = rotateom(rq.posK, rotpoint, hoek);
        rq.children.forEach(ch => {
            q.push(ch)
        });
    }
} // rotateTriangles

// rotate een triangle en al zijn nazaten om de oorsprong.
function rotateTrianglesOmNul(r, hoek) {
    let q = [r];
    while (q.length > 0) {
        rq = q.pop();
        //        print("rotate:",rq.id,rq.node.id,(180*hoek/PI).toFixed(2));
        rq.posL = rotateomnul(rq.posL, hoek);
        rq.posR = rotateomnul(rq.posR, hoek);
        rq.posP = rotateomnul(rq.posP, hoek);
        rq.posK = rotateomnul(rq.posK, hoek);
        rq.children.forEach(ch => {
            q.push(ch)
        });
    }
}

// translate een triangle en al zijn nazaten.
function translateTriangles(r, move) {
    let q = [r];
    while (q.length > 0) {
        rq = q.pop();
        rq.posL.add(move);
        rq.posR.add(move);
        rq.posP.add(move);
        rq.posK.add(move);
        rq.children.forEach(ch => q.push(ch));
    }
}

// Hulpfuncties die bepalen of lijnsstukken elkaar snijden of een lijnstuk en een bol elkaar snijden. 
let between = function (p, lp1, lp2) {
    xmin = Math.min(lp1.x, lp2.x);
    xmax = Math.max(lp1.x, lp2.x);
    ymin = Math.min(lp1.y, lp2.y);
    ymax = Math.max(lp1.y, lp2.y);
    return p.x >= xmin && p.x <= xmax && p.y >= ymin && p.y <= ymax;
}

function snijdenelkaar(pl11, pl12, pl21, pl22) {
    let calclijn = function (p1, p2) {
        // (y-y1) = (y1-y2)/(x1-x2) * (x-x1) => (y1-y2)/(x1-x2)*x - y = (y1-y2)/(x1-x2)*x1 +y1
        // a = (y1-y2)/(x1-x2); b = -1; c = (y1-y2)/(x1-x2)*x1+ + y1
        // a = (y2-y1); b = (x2-x1); c = y2*x1 - y1*x2
        // uitproberen: x1,y1: (y2-y1)*x1 - (x2-x1)*y1 = y2*x1 - x2*y1
        // Uitproberen: x2,y2: (y2-y1)*x2 - (x2-x1)*y2 = x1*y2 - y1*x2
        let a = p2.y - p1.y;
        let b = -p2.x + p1.x;
        let c = p2.y * p1.x - p2.x * p1.y;
        return { a, b, c };
    }
    let calcsnijpunt = function (abc1, abc2) {
        let n = abc1.a * abc2.b - abc2.a * abc1.b;
        let x = (abc1.c * abc2.b - abc2.c * abc1.b) / n;
        let y = (abc2.c * abc1.a - abc1.c * abc2.a) / n;
        return { x, y };
    }
    let kruising = function (s, l11, l12, l21, l22) {
        return between(s, l11, l12) && between(s, l21, l22);
    }

    let abc1 = calclijn(pl11, pl12);
    let abc2 = calclijn(pl21, pl22);
    let snp = calcsnijpunt(abc1, abc2);
    return kruising(snp, pl11, pl12, pl21, pl22)
} // snijdenelkaar

function lijnsnijdtcircle(l1, l2, r, c) {
    // translate l1 naar oorsprong. Met l2 en c
    //let l1t = createVector(0,0); // l1t is niet nodig.
    let l2t = mVector.sub(l2, l1);
    let ct = mVector.sub(c, l1);
    // rotate l1,l2 en c met -hoek van l2 met x-as. l1 is de oorsprong dus hoekrotatie onnodig.
    let hoek = Math.atan2(l2t.y, l2t.x);
    l2t.rotate(-hoek);
    ct.rotate(-hoek);
    // de lijn l1-l2 ligt nu op de x-as (y==0) met l1 in de oorsprong.
    if (Math.abs(ct.y) > r) return []; // de circle snijdt niet de x-as.
    let dx = Math.sqrt(r * r - ct.y * ct.y); // oplossen naar x van (x-c.x)**2 = r**2 - (y-c.y)**2 met y==0;
    let result = [createmVector(ct.x - dx, 0), createmVector(ct.x + dx, 0)];
    // de snijpunten terug transformeren.
    for (let i = 0; i < 2; i++) {
        result[i].rotate(hoek); // eerst de hoekrotatie
        result[i].add(l1); // vervolgens de translatie
    }
    return result;
} // lijnsnijdtcircle

// de cluster class
class knoop {

    static addedge(a, b, cost) {
        let eh;
        if (a.id < b.id) {
            eh = new edge(a, b, cost);
        } else {
            eh = new edge(b, a, cost);
        }
        a.edges.push(eh);
        b.edges.push(eh);
        eh.id = edges.length;
        edges[eh.id] = eh;
    } // addedge

    constructor(id, name, eu) {
        this.id = id;
        this.name = name;
        this.eu = eu;
        this.groep = -1;
        this.x = 0; // de x en y op het scherm.
        this.y = 0;
        this.ra = 0.22; // de radius van de getekende bol.
        this.len = 1; // de afstand naar de kinderen.
        this.edges = []; // de verbindingen tussen de clusters
        this.span_edges = []; // de verbindingen die de minimum distiance tree definieren.
        this.sp = sp_no; // indicatie of de knoop tot de in opbouw zijnde mst behoort.
        this.hop = -1; // het (maximum) aantal hops om een leave te bereiken
        this.mhopr = []; // de rij aan knopen om de leave te bereiken met het maximum aantal hops. 
        this.visited = false;
        this.treelevel = -1; // de root heeft treelevel 0; elke generatie heeft een treelevel hoger
        this.backbone = false; // de knoop behoort tot de backbone
        this.ve = null; // de vector met de x en y waarden van de positie van de knoop. (cluster)
        this.nep = false; // indicatie of knoop is toegevoegd vanwege een toegevoegde verbinding
        this.draw = true; // heeft alleen betekenis wanneer nep = true;
        this.children = []; // de kinderen van de knoop.
        this.nazaten = -1; // het aantal nazaten.
        this.parent = null; // de parent van de knoop.
        this.triangle = []; // de triangle die tot de knoop behoort. Een backbone knoop heeft 2 triangles.
    } // constructor

    getSpanNeighbours() {
        return this.span_edges.map(e => knopen[e.getOtherId(this.id)]);
    }

    removeEdge(id) {
        let ind = this.edges.findIndex(e => e.id == id);
        if (ind >= 0) {
            this.edges.splice(ind, 1);
        }
    }

    getin() {
        return this.id + "|" + this.name
    }
} // class knoop

// de astand tussen 2 clusters
class edge {

    constructor(source, dest, cost) {
        this.id = -1;
        this.cost = cost;
        this.source = source;
        this.lds = false;
        this.dest = dest;
        this.ldd = false;
        this.nep = false;
        this.draw = true; // heeft alleen betekenis wanneer nep = true;
        this.orig_edge = null; // deze fake edge heeft een real edge
        this.fake_edge = null; // deze real edge heeft een fake edge
        this.sp = sp_no;
        this.ra = 0.12;
//        this.candidate = false;
        this.name = `${this.source.getin()}/${this.dest.getin()}`
    } // constructor

    getOtherId(id) {
        return this.source.id + this.dest.id - id;
    }

    getName1() {
        return this.source.getin();
    }

    getName2() {
        return this.dest.getin();
    }
} // class edge

class mVector {

    static fromAngle(hoek) {
        return createmVector(Math.cos(hoek), Math.sin(hoek));
    }

    static mult(v, factor) {
        return createmVector(v.x * factor, v.y * factor);
    }

    static add(v1, v2) {
        return createmVector(v1.x + v2.x, v1.y + v2.y);
    }

    static sub(v1, v2) {
        return createmVector(v1.x - v2.x, v1.y - v2.y);
    }

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    copy() {
        return createmVector(this.x, this.y);
    }

    mult(factor) {
        this.x *= factor;
        this.y *= factor;
        return this;
    }

    angle() {
        return Math.atan2(this.y, this.x)
    }

    rotate(hoek) {
        let sa = Math.sin(hoek);
        let ca = Math.cos(hoek);
        let nx = this.x * ca - this.y * sa;
        let ny = this.x * sa + this.y * ca;
        this.x = nx;
        this.y = ny;
        return this;
    }

    angleBetween(vec) {
        let h1 = Math.atan2(this.y, this.x);
        let h2 = vec.copy().rotate(-h1);
        return Math.abs(Math.atan2(h2.y, h2.x));
    }
} // class mVector

function createmVector(x, y) {
    return new mVector(x, y);
}

class triangle {

    constructor(n) {
        this.id = -1;
        this.angle = 0;
        this.posL = null;
        this.posR = null;
        this.posP = null;
        this.posK = null;
        this.node = n;
        this.parent = null;
        this.children = [];
        this.side = -1; // 0:links, 1:rechts;
    }

} // class triangle

function createTriangle(n) {
    let i = triangles.length;
    let t = new triangle(n);
    triangles[i] = t;
    t.id = i;
    n.triangle.push(t);
    return t;
}

class svg {

    constructor() {
        this.start = //'<!DOCTYPE svg PUBLIC ".//W3C//DTD SVG 1.1//EN"' + 
            //' "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"' +
            '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"' +
            ' xmlns:xlink="http://www.w3.org/1999/xlink"' +
            ' xml:space="preserve" ' +
            [/*this.f("width", width+extrawidth), this.f("height", height),*/
                'viewBox="0 0', width + extrawidth, height, '"',
                'preserveAspectRatio="xMidYMid meet" >'].join(' ');
        this.einde = '</svg>'
        this.teksten = [];
    }
/*
    printtofile(fname) {
        let writer = createWriter(fname);
        writer.print(this.start);
        this.teksten.forEach(t => writer.print(t));
        writer.print(this.einde);
        writer.close();
        writer.clear();
    }
*/
    getsvgtext() {
        return this.start + this.teksten.join('\n') + this.einde;
    }
} // class svg

function add(s) {
    txtsvg.teksten.push(s);
}

function f2(v) {
    return v.toFixed(2);
}

// laat de edge zien die door een muisklik is aangewezen.
function ShowLine(event) {
    let switchoff = false;
    let lineall = span_edges.map(e => e.id);
    let f1 = document.getElementById(`line${event}`);
    if (f1 !== null) {
        let h = f1.getAttribute("opacity");
        switchoff = (h == "1");
    }
    lineall.forEach(id => {
        let f = document.getElementById(`line${id}`);
        if (f !== null) f.setAttribute("opacity", "0")
    })
    if (!switchoff) {
        if (f1 !== null) f1.setAttribute("opacity", "1");
    }
}

// laat de knopen zien die door een muisklik is aangewezen.
function ShowMe(event) {
    let switchoff = false;
    let knpall = knopen.map(k => k.id);
    let knp = knopen.filter(e => e.name == event).map(k => k.id);
    if (knp.length > 0) {
        let f = document.getElementById(`knoop${knp[0]}`);
        if (f !== null) {
            let h = f.getAttribute("opacity")
            switchoff = (h == "1")
        }
    }
    knpall.forEach(id => {
        let f = document.getElementById(`knoop${id}`);
        if (f !== null) f.setAttribute("opacity", "0");
    })
    if (!switchoff) {
        knp.forEach(id => {
            let f = document.getElementById(`knoop${id}`);
            if (f !== null) f.setAttribute("opacity", "1");
        })
    }
}
