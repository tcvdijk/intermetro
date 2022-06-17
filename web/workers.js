
var Functions = {
    "recolor": ver => {
      for(let e in ver.graphs.mG.edges){
          ver.graphs.mG.edges[e].ls.visual.objectColor = "cyan";
      }
    },
    "localSearch": ver => {
      let c = Number.MAX_SAFE_INTEGER;
      do{
        c = ver.results.cost;
        MetroMap.Post.localSearchStep(ver);
      }while(ver.results.cost < c);
    },
    "localSearchAll": ver => {
      let c;
      do{
        c = ver.results.cost;
        MetroMap.Post.localSearchStepAll(ver);
      }while(ver.results.cost < c);
    }
};

onmessage = function(e) {
  let sT = Date.now();
  let ver = Util.deserializeVer(e.data);
  ver.isCurrent = true;
  Version.current = ver;
  Version.store[ver.versionIndex] = ver;
  Version.history = [[ver]];
  let funcName = ver.funcName;
  ver.funcName = undefined;
  console.log('Worker executing ' + funcName);
  if(Functions[funcName]) Functions[funcName](ver);
  else console.warn("worker doesnt know function " + funcName);
  // console.log(e.data)
  ver.isCurrent = false;
  ver.results.calcTime = (Date.now()-sT);
  console.log('Worker sending back results of ' + funcName + " after " + (Date.now()-sT) + "ms");
  postMessage(Util.serializeVer(ver));
}

var document;

//use modules if safari support isnt needed
var Writing = {
  suppressDialogue: true,
  measurePerformance: false,
  loadTime: Date.now(),
  hlImageE: [],
  hlImageV: [],
  hlCGV: false,
}

var Canvas = {
  Colors: {//https://coolors.co/ff595e-ffca3a-60defb-4c191b-7452a3-1b9d8e
    highlight: "#FF595E",
    highlight2: "#FFCA3A", //un-tools
    origVtx: "#4C191B",
    origEdge: "#4C191B",
    currentVtx: "#7452A3",
    currentEdge: "#7452A3",
    resultVtx: "#1B9D8E",//329A79
    resultEdge: "#1B9D8E",
    // highlight: "#ef476f",
    // highlight2: "#ffd166", //un-tools
    // origVtx: "#06d6a0",
    // origEdge: "#06d6a0",
    // currentVtx: "#118ab2",
    // currentEdge: "#118ab2",
    // resultVtx: "#073b4c",
    // resultEdge: "#073b4c",
    // highlight: "OrangeRed",
    // highlight2: "yellow", //un-tools
    // origVtx: "RoyalBlue",
    // origEdge: "RoyalBlue",
    // currentVtx: "SeaGreen",
    // currentEdge: "SeaGreen",
    // resultVtx: "RebeccaPurple",
    // resultEdge: "RebeccaPurple",
    dcHl1: "#60DEFB",
    dcHl2: "#4C191B",
    dcHl3: "#FFCA3A",
    eSel1: "#60DEFB",
    eSel2: "#FFCA3A",
    wSel1: "#FFCA3A",
  }
}

var Version = {
  getDefault: () => {return {
    isCurrent: true,
    versionIndex: 0,
    graphs: {cG: null, mG: null, gridG: null},
    results: {edgeOrder: [], lineDrawing: null, vertexOrder: [], resultDijkstras: [], cost: 0, calcTime: 0},
    routeSettings: {disallowBends: false, contractAllowed: {}, straightEdges: [], positionedStations: {}, frozenEdges: {}, movedInputs: {}}, //disalloweBends only works when s2sd gets just one s-vtx, for contractAllowed 0 means psl contract, 1 contr bc straight edge, 2 dont bc degree, 3 pls dont
    currentToolID: "navigate",
    objectStore: {idCounter: 0, objects: {}},
    viewport: {x: 9.88, y: -49.81, w: 0.1, h: 0.1},
    costs: {"min": 0.00001, "gr": 0.75, "c180": 0, "c135": 0, "c90": 0, "c45": 0, "cs": 0, "ch": 0, "cm": 0, "cc": 0, "candidateRadius": 3, "livePreviewRange": 8},
    checkBoxes: {"cbShowMG": false, "cbShowGrid": false, "cbShowCG": true,  "cbShowResult": true,  "cbShowLineDrawing": false}
    //min is cost>0 for edges from s2s-start, grid res, bend costs, sink, hop, move penalty, spring compression
  };},
  current: null,
  history: [null],
  store: {},
  nextFreeIndex: 1,
  dupe: (ver, dupeVerID) => {
    let cv = {
      isCurrent: true,
      versionIndex: dupeVerID,
      currentToolID: ver.currentToolID,
      viewport: Util.cloneDict(null, ver.viewport),
      costs: Util.cloneDict(null, ver.costs),
      checkBoxes: Util.cloneDict(null, ver.checkBoxes),
      objectStore: {idCounter: 0, objects: {}} //gets overwritten
    };
    for(let o in ver.objectStore.objects){
      if(ver.objectStore.objects[o].objType == "Point") Geometry.objTypes.Point.dupe(ver.objectStore.objects[o], cv);
    }
    for(let o in ver.objectStore.objects){
      if(ver.objectStore.objects[o].objType == "LineSegment") Geometry.objTypes.LineSegment.dupe(ver.objectStore.objects[o], cv);
    }
    // cv.objectStore = {idCounter: ver.objectStore.idCounter, objects: objects}; 
    cv.graphs = Util.cloneDict(cv, ver.graphs, [], true);
    if(ver.graphs.gridG.s2sDijkstraIDSortedVtcs){
      cv.graphs.gridG.s2sDijkstraIDSortedVtcs = [];
      for(let v of ver.graphs.gridG.s2sDijkstraIDSortedVtcs) cv.graphs.gridG.s2sDijkstraIDSortedVtcs.push(cv.graphs.gridG.vertices[v.id]);
    }
    for(let e in ver.graphs.gridG.edges){
      if(ver.graphs.gridG.edges[e].origEdge) cv.graphs.gridG.edges[e].origEdge = cv.graphs.cG.edges[ver.graphs.gridG.edges[e].origEdge.id];
      if(ver.graphs.gridG.edges[e].blockedDiagonals){
        cv.graphs.gridG.edges[e].blockedDiagonals = [];
        for(let bd of ver.graphs.gridG.edges[e].blockedDiagonals) cv.graphs.gridG.edges[e].blockedDiagonals.push(cv.graphs.gridG.edges[bd.id]);
      }
    }
    for(let e in ver.graphs.cG.edges){
      if(ver.graphs.cG.edges[e].path){
        cv.graphs.cG.edges[e].path = [];
        for(let v of ver.graphs.cG.edges[e].path) cv.graphs.cG.edges[e].path.push(cv.graphs.gridG.vertices[v.id]);
      }
      if(ver.graphs.cG.edges[e].edgePath){
        cv.graphs.cG.edges[e].edgePath = [];
        for(let e2 of ver.graphs.cG.edges[e].edgePath) cv.graphs.cG.edges[e].edgePath.push(cv.graphs.gridG.edges[e2.id]);
      }
      if(ver.graphs.cG.edges[e].chain){
        cv.graphs.cG.edges[e].chain = [];
        for(let e2 of ver.graphs.cG.edges[e].chain) cv.graphs.cG.edges[e].chain.push(cv.graphs.mG.edges[e2.id]);
      }
    }
    // if(ver.graphs.deg2G) for(let e in ver.graphs.deg2G.edges){ idk why that was here
    //   if(ver.graphs.currG.edges[e].edgePath){
    //     cv.graphs.currG.edges[e].edgePath = [];
    //     for(let e2 of ver.graphs.currG.edges[e].edgePath) cv.graphs.currG.edges[e].edgePath.push(cv.graphs.gridG.edges[e2.id]);
    //   }
    // }
    for(let v in ver.graphs.gridG.vertices){
      if(ver.graphs.gridG.vertices[v].origStation) cv.graphs.gridG.vertices[v].origStation = cv.graphs.cG.vertices[ver.graphs.gridG.vertices[v].origStation.id];
    }
    for(let v in ver.graphs.mG.vertices){
      if(ver.graphs.mG.vertices[v].contract){
        cv.graphs.mG.vertices[v].contract = {visited: ver.graphs.mG.vertices[v].contract.visited};
        if(ver.graphs.mG.vertices[v].contract.v) cv.graphs.mG.vertices[v].contract.v = cv.graphs.cG.vertices[ver.graphs.mG.vertices[v].contract.v.id];
      }
    }
    for(let v in ver.graphs.cG.vertices){
      if(ver.graphs.cG.vertices[v].gridNode) cv.graphs.cG.vertices[v].gridNode = cv.graphs.gridG.vertices[ver.graphs.cG.vertices[v].gridNode.id];
      if(ver.graphs.cG.vertices[v].contractParent) cv.graphs.cG.vertices[v].contractParent = cv.graphs.mG.vertices[ver.graphs.cG.vertices[v].contractParent.id];
    }
    for(let o in ver.objectStore.objects){
      if(ver.objectStore.objects[o].objType == "LineBundle" || ver.objectStore.objects[o].objType == "Station"){
        Geometry.objTypes[ver.objectStore.objects[o].objType].dupe(ver.objectStore.objects[o], cv);
        if(ver.objectStore.objects[o].objType == "LineBundle") cv.objectStore.objects[o].e.lb = cv.objectStore.objects[o];
        else if(!cv.objectStore.objects[o].expandedStation) cv.objectStore.objects[o].v.station = cv.objectStore.objects[o];
      }
    }
    for(let o in ver.objectStore.objects){
      if(ver.objectStore.objects[o].objType == "LineBundle" && ver.objectStore.objects[o].expandedStations){
        cv.objectStore.objects[o].expandedStations = [];
        for(let s of ver.objectStore.objects[o].expandedStations) cv.objectStore.objects[o].expandedStations.push(cv.objectStore.objects[s.id]);
      }
    }
    cv.objectStore.idCounter = ver.objectStore.idCounter;
    // for(let o in ver.objectStore.objects){
    //   if(ver.objectStore.objects[o].v){
    //     // cv.objectStore.objects[o].v = ver.objectStore.objects[o].dupe(cv);
    //   }
    // }
    let edgeOrder = [];
    let stations = [];
    let lineBundles = [];
    let vertexOrder = [];
    let resultDijkstras = [];
    for(let e of ver.results.edgeOrder) edgeOrder.push(cv.graphs.cG.edges[e.id]);
    for(let s of ver.results.lineDrawing[0]) stations.push(cv.objectStore.objects[s.id]);
    for(let lb of ver.results.lineDrawing[1]) lineBundles.push(cv.objectStore.objects[lb.id]);
    // for(let v of ver.results.vertexOrder) vertexOrder.push(cv.graphs.cG.vertices[v.id]); //TODO remove?
    for(let d of ver.results.resultDijkstras){
      let path = [];
      let edgePath = [];
      for(let v of d[2]) path.push(cv.graphs.gridG.vertices[v.id]);
      for(let e of d[3]) edgePath.push(cv.graphs.gridG.edges[e.id]);
      resultDijkstras.push([d[0], d[1], path, edgePath, cv.graphs.cG.edges[d[4].id]]);
    }
    cv.results = {edgeOrder: edgeOrder, lineDrawing: [stations, lineBundles], vertexOrder: vertexOrder, resultDijkstras: resultDijkstras, cost: 0, calcTime: 0};
    let contractAllowed = {};
    for(let v in ver.routeSettings.contractAllowed) contractAllowed[v] = ver.routeSettings.contractAllowed[v];
    let straightEdges = [];
    for(let se of ver.routeSettings.straightEdges) straightEdges.push(se.map(e => cv.graphs.mG.edges[e.id]));
    let positionedStations = {};
    for(let v in ver.routeSettings.positionedStations) positionedStations[v] = cv.graphs.gridG.vertices[ver.routeSettings.positionedStations[v].id];
    let frozenEdges = {};
    for(let e in ver.routeSettings.frozenEdges) frozenEdges[e] = {groupID: ver.routeSettings.frozenEdges[e].groupID, bendToPortSeq: ver.routeSettings.frozenEdges[e].bendToPortSeq.map(p => p), iSTDiff: ver.routeSettings.frozenEdges[e].iSTDiff, jSTDiff: ver.routeSettings.frozenEdges[e].jSTDiff};
    let movedInputs = {};
    for(let v in ver.routeSettings.movedInputs) movedInputs[v] = {x: ver.routeSettings.movedInputs[v].x, y: ver.routeSettings.movedInputs[v].y};
    cv.routeSettings = {disallowBends: ver.routeSettings.disallowBends, contractAllowed: contractAllowed, straightEdges: straightEdges, positionedStations: positionedStations, frozenEdges: frozenEdges, movedInputs: movedInputs};
    return cv;
  },
  load: (verID) => {
    let ver = Version.store[verID];
    if(document.getElementsByClassName("active").length > 0) document.getElementsByClassName("active")[0].classList.remove("active");
    document.getElementById("vA"+verID).classList.add("active");
    document.getElementById("timeOut").innerText = "Loaded Version " + verID;
    let cv = Version.dupe(ver, Version.nextFreeIndex++);
    Version.current.isCurrent = false;
    Version.store[cv.versionIndex] = cv;
    Version.current = cv;
    Version.current.isCurrent = true;
    Canvas.redraw();
    for(let c of [["GridResIn", "gr"], ["45CostIn", "c45"], ["90CostIn", "c90"], ["135CostIn", "c135"], ["180CostIn", "c180"], ["MoveCostIn", "cm"], ["SinkCostIn", "cs"], ["HopCostIn", "ch"], ["CompressionCostIn", "cc"], ["CandidateRadiusIn", "candidateRadius"], ["LivePreviewRangeIn", "livePreviewRange"]]) 
      document.getElementById(c[0]).innerText = ver.costs[c[1]];
    for(let cb in ver.checkBoxes) document.getElementById(cb).checked = ver.checkBoxes[cb];
    for(let e of document.getElementById("toolBox").children) e.firstChild.checked = e.firstChild.id == ver.currentToolID;
    Tool.updateCurrentTool();
    Util.updateCosts();
  }
};

var Util = {
  Graph: {
    constr: (ver, type) => {
      return {verID: ver.versionIndex, type: type, objType: "Graph", vertices: {}, edges: {}, vIDCounter: 0, eIDCounter: 0};
    },
    addVertex: (g, id) => {
      if(id) g.vIDCounter = id;
      let v = Util.Vertex.constr(Version.store[g.verID], g.type, g.vIDCounter);
      g.vertices[g.vIDCounter] = v;
      g.vIDCounter++;
      return v;
    },
    removeVertex: (g, v) => {
      delete g.vertices[v.id];
      while(v.es.length > 0){
        Util.Graph.removeEdge(g, v.es[0]);
      }
      if(v.p){
        v.p.visual.objectShown = false;
        v.p.visual.highlightShown = false;
        // Geometry.removeGeoObject(Version.store[g.verID], v.p);
      }
    },
    addEdge(g, sID, tID, cost){
      if(!g.vertices[sID] || !g.vertices[tID]) console.error("Vtx ID " + sID + " or " + tID + "doesn't exist!");
      let e = Util.Edge.constr(Version.store[g.verID], g.eIDCounter, g.vertices[sID], g.vertices[tID], g.type);
      if(cost) console.error("no more costs")
      g.edges[g.eIDCounter] = e;
      g.eIDCounter++;
      return e;
    },
    removeEdge: (g, e) => {
      delete g.edges[e.id];
      let ind = e.s.es.indexOf(e);
      if (ind > -1) e.s.es.splice(ind, 1);
      ind = e.t.es.indexOf(e);
      if (ind > -1) e.t.es.splice(ind, 1);
      if(e.ls){
        e.ls.visual.objectShown = false;
        e.ls.visual.highlightShown = false;
        // Geometry.removeGeoObject(Version.store[g.verID], e.ls);
      }
    },
    removeAll: (g) => {
      for(let v in g.vertices){
        Util.Graph.removeVertex(g, g.vertices[v]);
      }
    },
    dupe: (g, ver) => {
      let g2 = Util.Graph.constr(ver, g.type);
      for(let v in g.vertices){
        g2.vertices[v] = Util.Vertex.dupe(g.vertices[v], ver);
      }
      for(let e in g.edges){
        let e2 = Util.Edge.constr(ver, e, g2.vertices[g.edges[e].s.id], g2.vertices[g.edges[e].t.id], g.type);
        g2.edges[e] = e2;
        if(g.edges[e].ls) e2.ls = ver.objectStore.objects[g.edges[e].ls.id];
        if(g.edges[e].costKeys){
          e2.costKeys = [];
          for(let ck of g.edges[e].costKeys){
            if(ck.a){
              e2.costKeys.push({a: ver.objectStore.objects[ck.a.id], b: ver.objectStore.objects[ck.b.id], l: ck.l});
            }else e2.costKeys.push(ck);
          }
        }
        if(g.edges[e].lines){
          e2.lines = [];
          for(let l of g.edges[e].lines) e2.lines.push(l);
        }
        let others = Util.cloneDict(ver, g.edges[e], ["verID", "id", "s", "t", "ls", "lb", "costKeys", "origEdge", "lines", "edgePath", "path", "blockedDiagonals", "chain"]);
        for(let x in others) e2[x] = others[x];
      }
      for(let v in g.vertices){
        if(g.vertices[v].ports){
          g2.vertices[v].ports = [];
          for(let p of g.vertices[v].ports) g2.vertices[v].ports.push(g2.vertices[p.id]);
        }
        if(g.vertices[v].dijkstra){
          g2.vertices[v].dijkstra = {};
          if(g.vertices[v].dijkstra.p) g2.vertices[v].dijkstra.p = g2.vertices[g.vertices[v].dijkstra.p.id];
          if(g.vertices[v].dijkstra.pe) g2.vertices[v].dijkstra.pe = g2.edges[g.vertices[v].dijkstra.pe.id];
          let others = Util.cloneDict(ver, g.vertices[v].dijkstra, ["p", "pe"]);
          for(let x in others) g.vertices[v].dijkstra[x] = others[x];
        }
        if(g.vertices[v].parent){
          g2.vertices[v].parent = g2.vertices[g.vertices[v].parent.id];
        }
      }
      if(g.gridNodes){
        g2.gridNodes = [];
        for(let i = 0; i < g.gridNodes.length; i++){
          g2.gridNodes.push([]);
          for(let j = 0; j < g.gridNodes[i].length; j++){
            g2.gridNodes[i].push(g2.vertices[g.gridNodes[i][j].id]);
          }
        }
        g2.simpleVis = [];
        for(let ls of g.simpleVis) g2.simpleVis.push(ver.objectStore.objects[ls.id]);
      }
      let others = Util.cloneDict(ver, g, ["verID", "vertices", "edges", "gridNodes", "simpleVis", "s2sDijkstraIDSortedVtcs"]);
      for(let x in others) g2[x] = others[x];
      return g2;
    }
  },
  Vertex: {
    constr: (ver, gType, id) => {
      return {verID: ver.versionIndex, objType: "Vertex", gType: gType, id: id, es: []};
    },
    addEdge: (v, e) => {
      v.es.push(e);
    },
    dupe: (v, ver) => {
      let v2 = Util.Vertex.constr(ver, v.gType, v.id);
      if(v.p) v2.p = ver.objectStore.objects[v.p.id];
      let others = Util.cloneDict(ver, v, ["verID", "gType", "id", "es", "p", "ports", "parent", "origStation", "station", "dijkstra", "gridNode", "contract", "contractParent"]);
      for(let x in others) v2[x] = others[x];
      return v2;
    }
  },
  Edge: {
    constr: (ver, id, s, t, gType) => {
      let e = {verID: ver.versionIndex, objType: "Edge", id: id, s: s, t: t, gType: gType, occupiedStatus: 0, occupiedStatusDict: {}};
      //occupiedStatus -1 is temp open, 0 is use cost, 1 is sink/bend closed, 2 is actually in use (or diag), 3 sink temp closed to preserve embedding
      Util.Vertex.addEdge(s, e);
      Util.Vertex.addEdge(t, e);
      return e;
    },
    v2: (e, v) => {
      if(v.id == e.s.id) return e.t;
      if(v.id == e.t.id) return e.s;
      console.error("tried to get edge partner of a vtx not on the edge")
      return false;
    },
    calcCost: (e) => {
      let ver = Version.store[e.verID];
      let c = 0;
      for(let ck of e.costKeys){
        if(!ck) console.error("unknown cost key", ck, e)
        if(ck.a && ck.b) c += Geometry.distanceBetween(ck.a, ck.b)*(ver.costs.ch+ver.costs.cm)/ver.graphs.gridG.D;
        else if(ver.costs[ck]) c += ver.costs[ck];
        else console.error("unknown cost key", ck, e)
      }
      return c;
    }
  },
  updateCosts: () => {
    let costs = Version.current.costs;
    let vals = [["GridResIn", "gr"], ["45CostIn", "c45"], ["90CostIn", "c90"], ["135CostIn", "c135"], ["180CostIn", "c180"], ["MoveCostIn", "cm"], ["SinkCostIn", "cs"], ["HopCostIn", "ch"], ["CompressionCostIn", "cc"], ["CandidateRadiusIn", "candidateRadius"], ["LivePreviewRangeIn", "livePreviewRange"]];
    for(let val of vals){
      let x = document.getElementById(val[0]).innerText;
      if(x == "" || isNaN(x) || x < 0) document.getElementById(val[0]).style.color = "red";
      else{
        document.getElementById(val[0]).style.color = "black";
        if(val != "gr") costs[val[1]] = x - 0;
      }
    }
    if(2*costs.c135 < costs.c90){
      document.getElementById("90CostIn").style.color = "orange";
      document.getElementById("135CostIn").style.color = "orange";
    }
    if(costs.c180+costs.c135 < costs.c45){
      document.getElementById("45CostIn").style.color = "orange";
      document.getElementById("135CostIn").style.color = "orange";
      document.getElementById("180CostIn").style.color = "orange";
    }
    if(costs.c180 > costs.c135){
      document.getElementById("180CostIn").style.color = "orange";
      document.getElementById("135CostIn").style.color = "orange";
    }
    if(costs.c135 > costs.c90){
      document.getElementById("135CostIn").style.color = "orange";
      document.getElementById("90CostIn").style.color = "orange";
    }
    if(costs.c90 > costs.c45){
      document.getElementById("90CostIn").style.color = "orange";
      document.getElementById("45CostIn").style.color = "orange";
    }
    for(let c of ["45", "90", "135", "180"]){
      if(2*costs.cs <= costs["c"+c]){
        document.getElementById(c+"CostIn").style.color = "orange";
      }
    }
    // costs.c45 = document.getElementById("45CostIn").innerText - 0;
    // costs.c90 = document.getElementById("90CostIn").innerText - 0;
    // costs.c135 = document.getElementById("135CostIn").innerText - 0;
    // costs.c180 = document.getElementById("180CostIn").innerText - 0;
    // costs.cm = document.getElementById("MoveCostIn").innerText - 0;
    // costs.cs = document.getElementById("SinkCostIn").innerText - 0;
    // costs.ch = document.getElementById("HopCostIn").innerText - 0;
    // costs.candidateRadius = document.getElementById("CandidateRadiusIn").innerText - 0;
    // costs.livePreviewRange = document.getElementById("LivePreviewRangeIn").innerText - 0;
  },
  updateObjectsShown: () => {
    let ver = Version.current;
    for(let cb in ver.checkBoxes) ver.checkBoxes[cb] = document.getElementById(cb).checked;
    if(ver.graphs.mG){
      for(let v in ver.graphs.mG.vertices){
        ver.graphs.mG.vertices[v].p.visual.objectShown = document.getElementById("cbShowMG").checked;
        if(!document.getElementById("cbShowMG").checked) ver.graphs.mG.vertices[v].p.visual.highlightShown = false;
        //if(ver.graphs.mG.vertices[v].ver.graphs.mGToGridConnectors) ver.graphs.mG.vertices[v].ver.graphs.mGToGridConnectors.visual.objectShown = document.getElementById("cbShowMG").checked && (document.getElementById("cbShowResult").checked || document.getElementById("cbShowLineDrawing").checked);
      }
      for(let e in ver.graphs.mG.edges){
        ver.graphs.mG.edges[e].ls.visual.objectShown = document.getElementById("cbShowMG").checked;
        if(!document.getElementById("cbShowMG").checked) ver.graphs.mG.edges[e].ls.visual.highlightShown = false;
      }
    }else if(document.getElementById("cbShowMG").checked) console.log("no mg available");
    if(ver.graphs.gridG){
      for(let ls of ver.graphs.gridG.simpleVis){
        ls.visual.objectShown = document.getElementById("cbShowGrid").checked;
      }
    }else if(document.getElementById("cbShowGrid").checked) console.log("no grid available");
    if(ver.graphs.cG){
      for(let v in ver.graphs.cG.vertices) ver.graphs.cG.vertices[v].p.visual.objectShown = document.getElementById("cbShowCG").checked;
      for(let e in ver.graphs.cG.edges) ver.graphs.cG.edges[e].ls.visual.objectShown = document.getElementById("cbShowCG").checked;
    }else if(document.getElementById("cbShowCG").checked) console.log("no contraction available");
    if(ver.results.resultDijkstras){
      for(let d of ver.results.resultDijkstras){
        //for(let v of d[2]) v.p.visual.objectShown = document.getElementById("cbShowResult").checked;
        // d[3][0].s.p.visual.objectShown = document.getElementById("cbShowResult").checked;
        // d[3][0].t.p.visual.objectShown = document.getElementById("cbShowResult").checked;
        // d[3][d[3].length-1].s.p.visual.objectShown = document.getElementById("cbShowResult").checked;
        // d[3][d[3].length-1].t.p.visual.objectShown = document.getElementById("cbShowResult").checked;
        // d[2][0].origStation.p.visual.objectShown = document.getElementById("cbShowResult").checked;
        // d[2][d[2].length-1].origStation.p.visual.objectShown = document.getElementById("cbShowResult").checked;
        d[4].s.gridNode.p.visual.objectShown = document.getElementById("cbShowResult").checked;
        if(!document.getElementById("cbShowResult").checked) d[4].s.gridNode.p.visual.highlightShown = false;
        d[4].t.gridNode.p.visual.objectShown = document.getElementById("cbShowResult").checked;
        if(!document.getElementById("cbShowResult").checked) d[4].t.gridNode.p.visual.highlightShown = false;
        for(let e of d[3]){
          e.ls.visual.objectShown = document.getElementById("cbShowResult").checked;
          if(!document.getElementById("cbShowResult").checked) e.ls.visual.highlightShown = false;
        }
      }
    }else if(document.getElementById("cbShowResult").checked) console.log("no result available");
    if(ver.results.lineDrawing){
      for(let s of ver.results.lineDrawing[0]) s.visual.objectShown = document.getElementById("cbShowLineDrawing").checked;
      for(let lb of ver.results.lineDrawing[1]){
        lb.visual.objectShown = document.getElementById("cbShowLineDrawing").checked;
        if(lb.expandedStations) for(let s of lb.expandedStations) s.visual.objectShown = document.getElementById("cbShowLineDrawing").checked;
      }
    }else if(document.getElementById("cbShowLineDrawing").checked) console.log("no line drawing available");
    Canvas.redraw();
  },
  serializeVer: (ver, useCurrAsVer = false) => {
    let v2 = ver;
    if(useCurrAsVer) ver = Version.current;
    return JSON.stringify(v2, function(k, v){
      if(typeof v === "object" && v !== null && v.objType){
        if(["Point", "LineSegment", "Station", "LineBundle"].includes(v.objType)){
          if(this == ver.objectStore.objects) return v;
          else return "object,"+v.id;
        }else if(v.objType == "Vertex" && (isNaN(k) || (!ver.graphs.mG || this != ver.graphs.mG.vertices) && (!ver.graphs.cG || this != ver.graphs.cG.vertices) && (!ver.graphs.gridG || this != ver.graphs.gridG.vertices)))
          return v.gType+",vertices,"+v.id;
        else if(v.objType == "Edge" && (isNaN(k) || (!ver.graphs.mG || this != ver.graphs.mG.edges) && (!ver.graphs.cG || this != ver.graphs.cG.edges) && (!ver.graphs.gridG || this != ver.graphs.gridG.edges)))
          return v.gType+",edges,"+v.id;
        else return v;
      }else return v;
    });
  },
  deserializeVer: (s, verID, useCurrAsVer = false) => {
    let reinsertObjs = (ver, k, v, p, verID) => {
      if(verID && k == "verID") p[k] = verID;
      if(typeof v === "string"){
        let csv = v.split(",");
        if(csv.length == 2 && csv[0] == "object") p[k] = ver.objectStore.objects[csv[1]];
        else if(csv.length == 3 && ["mG", "cG", "gridG"].includes(csv[0])){
          p[k] = ver.graphs[csv[0]][csv[1]][csv[2]];
          // if(csv[0] == "mG" && csv[1] == "vertices") console.log(v, p[k], ver.graphs[csv[0]])
        }else if(csv.length > 1) console.log(v)
      }else if(typeof v === "object" && v !== null) for(let k2 in v) reinsertObjs(ver, k2, v[k2], v, verID);
    };
    let ver = JSON.parse(s);
    if(!verID) verID = ver.graphs.mG.verID;
    if(useCurrAsVer) reinsertObjs(Version.current, "", ver, null, verID);
    else reinsertObjs(ver, "", ver, null, verID);
    ver.versionIndex = verID;
    return ver;
  },
  cloneDict: (ver, d, exceptions = [], dupeAllowed = false) => {
    let e = {};
    for(let k in d){
      if(exceptions.includes(k)) continue;
      let v = d[k];
      if(typeof v === "object" && v !== null){
        if(v instanceof Array) console.warn("trying to copy array to dict", d, k, v, exceptions);
        else if(dupeAllowed){
          if(v.objType && Util[v.objType] && v.objType != "Edge") v = Util[v.objType].dupe(v, ver);
          else if(v.objType && Geometry.objTypes[v.objType]) Geometry.objTypes[v.objType].dupe(v, ver);
          else if(v.objType != "Edge") console.warn("idk this objType...", v.objType, d, k, v);
        }
        // else if(k == "occupiedStatusDict") console.log(v);
        else if(["gridCoords", "occupiedStatusDict", "visual", "objectDimensions", "arrowDimensions", "contract"].includes(k)) v = Util.cloneDict(ver, v);
        else console.warn("cloning Dict with non dupeable object in ", d, k, v);
      }
      e[k] = v;
    }
    return e;
  },
  binarySearch: (x, arr, comp, start, end, verbose = false) => { //returns [boolean: found, number: (potential) index]
    start = Math.max(0, Math.min(start, arr.length-1));
    end = Math.max(0, Math.min(end, arr.length-1));
    if(arr.length == 0) return [false, 0];
    if(start >= end){return [comp(x, arr[start]) == 0, comp(x, arr[start]) > 0 ? start+1 : start];}
    else{
      let mInd = start+Math.floor((end-start)/2);
      let mElem = arr[mInd];
      if(verbose)console.log(start + " (" + arr[start] + "), " + mInd + " (" + arr[mInd] + "), " +  end + " (" + arr[end] + "), " + x + " comp: " +comp(x, mElem))
      if(comp(x, mElem) == 0) return [true, mInd];
      else if(comp(x, mElem) > 0) return Util.binarySearch(x, arr, comp, mInd+1, end, verbose);
      else return Util.binarySearch(x, arr, comp, start, mInd, verbose);
    }
  },
  nearestTokens: (ver, event, collection, getLocation, eligibilityCheck = () => true, secialTreatmentForGrid = true) => {
    let coords = Canvas.mouseCoords(event);
    let p = Geometry.objTypes.Point.constr(ver, coords.x, coords.y, true);
    let minD = Number.MAX_SAFE_INTEGER;
    let X = [];
    if(secialTreatmentForGrid && collection[0] && collection[0].gType == "gridG"){
      let col2 = {};
      if(collection[0].objType == "Vertex"){
        for(let v in Version.current.graphs.cG.vertices){
          v = Version.current.graphs.cG.vertices[v].gridNode;
          if(eligibilityCheck(v)) col2[v.id] = v;
        }
        return Util.nearestTokens(ver, event, col2, v => v.p, () => true, false);
      }else if(collection[0].objType == "Edge"){
        return Util.nearestTokens(ver, event, ver.graphs.cG.edges, e => Util.nearestTokens(ver, event, e.edgePath, e2 => e2.ls, () => true, false).tokens[0].ls, eligibilityCheck, false);
        // for(let d of Version.current.results.resultDijkstras){
        //   if(eligibilityCheck(d[3])) col2[d[4].id] = d[3];
        // }
        // return Util.nearestTokens(ver, event, col2, ep => Util.nearestTokens(ver, event, ep, e => e.ls, () => true, false).tokens[0].ls, () => true, false);
      }else console.warn("diff obj type than expected", collection[0].objType);
    }else{
      for(let x in collection){
        x = collection[x];
        if(!eligibilityCheck(x)) continue;
        let d = Geometry.distanceBetween(p, getLocation(x));
        if(d < minD){
          minD = d;
          X = [x];
        }else if (d == minD) X.push(x); 
      }
    }
    return {tokens: X, d: minD};
  }
};

var Geometry = {
  addGeoObject: (ver, o) => {
    o.id = ver.objectStore.idCounter++;
    ver.objectStore.objects[o.id] = o;
    // console.log("added")
    // console.log(o.asString())
    // console.log(o)
    //document.getElementById("objectList").innerHTML += "<div id='objectInList" + o.id + "'contentEditable='true' onkeydown='objectStore.objectInListEdited(event);'>"/* + o.constructor.name + ": " */ + o.asString() + "</div>";
  },
  removeGeoObject: (ver, o) => {
    delete ver.objectStore.objects[o.id];
    // if(typeof o == Geometry.objTypes.LineSegment) console.log("removed " + o)
  },
  objTypes: {
    GeoObject: {
      constr: (ver) => {
        return {verID: ver.versionIndex, visual: {
          objectShown: true,
          objectColor: "blue",
          highlightShown: false,
          highlightColor: "pink",
          highlightSize: 5,
          labelShown: false,
          labelText: "",
          labelColor: "black",
          labelPosition: "top",
          labelSize: 12
        }};
      }
    },
    Station: {
      constr: (ver, v) => {
        let s = Geometry.objTypes.GeoObject.constr(ver);
        s.objType = "Station";
        s.v = v;
        s.expandedStation = v.expandedStation; 
        s.w = 6;
        s.h = 6;
        s.r = 3;
        s.tilted = false;
        if(s.expandedStation){
          dim1 = (v.lineCount-1)*(v.lineGap+v.lineSize);
          if(v.direction%2 == 1) s.tilted = true;
          if(v.direction == 0 || v.direction == 3) s.w += dim1;
          else if(v.direction == 1 || v.direction == 2) s.h += dim1;
        }else{
          let alignE, dim1;
          let dim2 = 1;
          let portOfEdge = e => v.ports.indexOf(e.path[0] == v ? e.path[1] : e.path[e.path.length-2]);
          if(v.origStation.es.length == 1 && v.origStation.es[0].lines.length > 1){
            alignE = v.origStation.es[0];
          }else if(v.origStation.es.length > 1){
            let lineBuckets = {};
            for(let e of v.origStation.es){
              let l = e.lines.length;
              if(!lineBuckets[l]) lineBuckets[l] = [];
              lineBuckets[l].push({e: e, p: portOfEdge(e), l: l});
            }
            lineNrs = Object.keys(lineBuckets);
            lineNrs.sort((a, b) => b-a); //decreasing
            if(lineBuckets[lineNrs[0]].length == 1){
              alignE = lineBuckets[lineNrs[0]][0];
            }else if(lineBuckets[lineNrs[0]].length == 2 && [-6, -2, 2, 6].includes(lineBuckets[lineNrs[0]][0].p - lineBuckets[lineNrs[0]][1].p)){
              let ed1 = lineBuckets[lineNrs[0]][0];
              let ed2 = lineBuckets[lineNrs[0]][1];
              dim1 = (ed1.e.lines.length-1)*(ed1.e.lb.lineGap+ed1.e.lb.lineSize);
              if(ed1.p%2 == 0) s.tilted = true;
              let p = Math.min(ed1.p, ed2.p) + (Math.max(ed1.p, ed2.p) - Math.min(ed1.p, ed2.p) == 6 ? 1 : -1); //might be false... tries to calc the port of the virtual alignE, between the edges
              lbLoop: for(let b in lineBuckets) for(let ed of lineBuckets[b]){
                let ang = Math.max(p, ed.p) - Math.min(p, ed.p);
                if(ang == 2 || ang == 6){
                  dim2 = ed.l;
                  break lbLoop;
                }
              }
              dim2 = (dim2-1)*(ed1.e.lb.lineGap+ed1.e.lb.lineSize);
              if(p%4 == 0 || p%4 == 3){
                s.w += dim1;
                s.h += dim2;
              }else if(p%4 == 1 || p%4 == 2){
                s.h += dim1; 
                s.w += dim2;
              }
            }else{
              prioLoop: for(let ps of [[2, 6], [0, 4], [1, 5], [3, 7]]){
                for(let ed of lineBuckets[lineNrs[0]]) if(ps.includes(ed.p)){
                  alignE = ed;
                  break prioLoop;
                }
              }
            }
            if(alignE){
              lbLoop: for(let b in lineBuckets) for(let ed of lineBuckets[b]){
                let ang = Math.max(alignE.p, ed.p) - Math.min(alignE.p, ed.p);
                if(ang == 2 || ang == 6){
                  dim2 = ed.l;
                  break lbLoop;
                }
              }
              alignE = alignE.e;
            }
          }

          if(alignE){
            let p = portOfEdge(alignE);
            if(!dim1) dim1 = alignE.lines.length
            dim1 = (dim1-1)*(alignE.lb.lineGap+alignE.lb.lineSize);
            dim2 = (dim2-1)*(alignE.lb.lineGap+alignE.lb.lineSize);
            if(p%2 == 1) s.tilted = true;
            if(p%4 == 0 || p%4 == 3){
              s.w += dim1;
              s.h += dim2;
            }else if(p%4 == 1 || p%4 == 2){
              s.h += dim1; 
              s.w += dim2;
            }
          }
        }
        Geometry.addGeoObject(ver, s);
        return s;
      },
      draw: (s, ctx) => {
        if(s.visual.objectShown){
          ctx.fillStyle = "white";
          ctx.strokeStyle = "black";
          ctx.lineWidth = 1;
          ctx.beginPath();
          if(s.tilted){
            let p = Canvas.coordsToPixel(s.v.p.x, s.v.p.y);
            let big = (s.w+s.h)/(Math.SQRT2*2);
            let small = big-s.h/Math.SQRT2;
            let rd = s.r*Math.SQRT2/2;
            ctx.moveTo(p.x + small - rd, p.y - big + rd);
            ctx.arc(p.x + small, p.y - big + 2*rd, s.r, -0.75*Math.PI, -0.25*Math.PI);
            ctx.lineTo(p.x + big - rd, p.y - small - rd);
            ctx.arc(p.x + big - 2*rd, p.y - small, s.r, -0.25*Math.PI, 0.25*Math.PI);
            ctx.lineTo(p.x - small + rd, p.y + big - rd);
            ctx.arc(p.x - small, p.y + big - 2*rd, s.r, 0.25*Math.PI, 0.75*Math.PI);
            ctx.lineTo(p.x - big + rd, p.y + small + rd);
            ctx.arc(p.x - big + 2*rd, p.y + small, s.r, 0.75*Math.PI, 1.25*Math.PI);
            ctx.lineTo(p.x + small - rd, p.y - big + rd);
          }else{
            let p = Canvas.coordsToPixel(s.v.p.x, s.v.p.y);
            let x = p.x-s.w/2;
            let y = p.y-s.h/2;
            ctx.moveTo(x + s.r, y);
            ctx.lineTo(x + s.w - s.r, y);
            ctx.arc(x + s.w - s.r, y + s.r, s.r, -0.5*Math.PI, 0);
            ctx.lineTo(x + s.w, y + s.h - s.r);
            ctx.arc(x + s.w - s.r, y + s.h - s.r, s.r, 0, 0.5*Math.PI);
            ctx.lineTo(x + s.r, y + s.h);
            ctx.arc(x + s.r, y + s.h - s.r, s.r, 0.5*Math.PI, 1*Math.PI);
            ctx.lineTo(x, y + s.r);
            ctx.arc(x + s.r, y + s.r, s.r, 1*Math.PI, 1.5*Math.PI);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      },
      dupe: (s, ver) => {
        let v;
        if(s.expandedStation){
          v = Util.cloneDict(ver, s.v, ["p"]);
          v.p = {x: s.v.p.x, y: s.v.p.y}
        }else v = ver.graphs.gridG.vertices[s.v.id];
        ver.objectStore.idCounter = s.id;
        let s2 = Geometry.objTypes.Station.constr(ver, v);
        let others = Util.cloneDict(ver, s, ["verID", "v", "draw", "dupe", "asString"]);
        for(let x in others) s2[x] = others[x];
        return s2;
      }
    },
    LineBundle: {
      constr: (ver, e, sOrient, tOrient, lineCols) => {
        let lb = Geometry.objTypes.GeoObject.constr(ver);
        lb.objType = "LineBundle";
        Geometry.addGeoObject(ver, lb);
        lb.e = e;
        lb.sOrient = sOrient;
        lb.tOrient = tOrient;
        lb.lineCols = lineCols;
        lb.lineSize = 2;
        lb.lineGap = 1;
        lb.ps = [];
        lb.visual.objectStroke = "line";
        for(let i = 0; i < e.path.length; i += 2){
          let v1 = e.path[i];
          let v2 = e.path[i+1];
          let pids;
          if(i == 0) pids = [sOrient, v1.ports.indexOf(v2)];
          else if(i == e.path.length-2) pids = [v2.ports.indexOf(v1), tOrient];
          else pids = [v1.parent.ports.indexOf(v1), v2.parent.ports.indexOf(v2)];
          let pid = Math.max(...pids);
          let pid2 = Math.min(...pids);
          let bendAng = pid-pid2;
          let xOffset, yOffset;
          if(bendAng == 4 && i != 0 && i != e.path.length-2) continue;
          if(bendAng == 7){
            xOffset = -0.2425;
            yOffset = -0.9701;
            /*
            7: -0.25, -1
            */
          }else if(bendAng == 6){
            xOffset = [0, -0.7071][7-pid];
            yOffset = [-1, -0.7071][7-pid];
            /*
            7: 0, -1
            6: -1, -1
            */
          }else if(bendAng == 5){
            xOffset = [0.2425, -0.2425, -0.9701][7-pid];
            yOffset = [-0.9701, -0.9701, -0.2425][7-pid];
            /*
            7: 0.25, -1
            6: -0.25, -1
            5: -1, -0.25
            */
          }else if(bendAng == 4){
            xOffset = [0.7071, 0, -0.7071, -1][7-pid];
            yOffset = [-0.7071, -1, -0.7071, 0][7-pid];
            /*
            7: 1, -1
            6: 0, -1
            5: -1, -1
            4: -1, 0
            */
          }else if(bendAng == 3){
            xOffset = [0.9701, 0.2425, -0.2425, -0.9701, -0.9701][7-pid];
            yOffset = [-0.2425, -0.9701, -0.9701, -0.2425, 0.2425][7-pid];
            /*
            7: 1, -0.25
            6: 0.25, -1
            5: -0.25, -1
            4: -1, -0.25
            3: -1, 0.25
            */
          }else if(bendAng == 2){
            xOffset = [1, 0.7071, 0, -0.7071, -1, -0.7071][7-pid];
            yOffset = [0, -0.7071, -1, -0.7071, 0, 0.7071][7-pid];
            /*
            7: 1, 0
            6: 1, -1
            5: 0, -1
            4: -1, -1
            3: -1, 0
            2: -1, 1
            */
          }else if(bendAng == 1){
            xOffset = [0.9701, 0.9701, 0.2425, -0.2425, -0.9701, -0.9701, -0.2425][7-pid];
            yOffset = [0.2425, -0.2425, -0.9701, -0.9701, -0.2425, 0.2425, 0.9701][7-pid];
            /*
            7: 1, 0.25
            6: 1, -0.25
            5: 0.25, -1
            4: -0.25, -1
            3: -1, -0.25
            2: -1, 0.25
            1: -0.25, 1
            */
          }
          if(i == 0) lb.ps.push([v1.p, {x: xOffset, y: yOffset}]);
          else if(i == e.path.length-2) lb.ps.push([v2.p, {x: xOffset, y: yOffset}]);
          else lb.ps.push([v1.parent.p, {x: xOffset, y: yOffset}]);
        }


        if(e.chain && e.chain.length > 1){
          lb.expandedStations = [];
          let segLengths = [];
          let pathLength = 0;
          let p = lb.ps[0][0];
          for(let i = 1; i < lb.ps.length; i++){
            let d = Geometry.distanceBetween(p, lb.ps[i][0]);
            segLengths.push(d);
            pathLength += d;
            p = lb.ps[i][0];
          }
          let sd = pathLength/e.chain.length;
          let dToGo = sd;
          let segC = 0;
          let segLeft = segLengths[0];
          for(let i = 0; i < e.chain.length-1; i++){
            while(segLeft <= dToGo){
              dToGo -= segLeft;
              segC++;
              segLeft = segLengths[segC];
            }
            segLeft -= dToGo;
            let d = segLengths[segC]-segLeft;
            let ux = (lb.ps[segC+1][0].x - lb.ps[segC][0].x)/segLengths[segC];
            let uy = (lb.ps[segC+1][0].y - lb.ps[segC][0].y)/segLengths[segC];
            let dir;
            if(lb.ps[segC+1][0].x == lb.ps[segC][0].x) dir = 0;
            else if(lb.ps[segC+1][0].y == lb.ps[segC][0].y) dir = 2;
            else if(lb.ps[segC+1][0].y > lb.ps[segC][0].y && lb.ps[segC+1][0].x > lb.ps[segC][0].x || lb.ps[segC+1][0].y < lb.ps[segC][0].y && lb.ps[segC+1][0].x < lb.ps[segC][0].x) dir = 3;
            else dir = 1;
            // console.log("placing station " + i  + " on segment " + segC + ", " + ((d/segLengths[segC])*100) +  "% in")
            lb.expandedStations.push(Geometry.objTypes.Station.constr(ver, {expandedStation: true, p: {x: lb.ps[segC][0].x + d*ux, y: lb.ps[segC][0].y + d*uy}, lineCount: lb.lineCols.length, direction: dir, lineSize: lb.lineSize, lineGap: lb.lineGap}));
            dToGo = sd;
          }
        }
        return lb;
      }, 
      draw: (lb, ctx) => {
        if(lb.visual.objectShown){
          ctx.lineWidth = lb.lineSize;
          if(lb.visual.objectStroke = "line") ctx.setLineDash = ([]);
          for(let l = 0; l < lb.lineCols.length; l++){
            let r = ((lb.lineCols.length-1)/2 - l) * (lb.lineSize + lb.lineGap);
            ctx.strokeStyle = lb.lineCols[l];
            ctx.beginPath();
            let p = Canvas.coordsToPixel(lb.ps[0][0].x, lb.ps[0][0].y);
            ctx.moveTo(p.x+r*lb.ps[0][1].x, p.y+r*lb.ps[0][1].y);
            for(let i = 1; i < lb.ps.length; i++){
              p = Canvas.coordsToPixel(lb.ps[i][0].x, lb.ps[i][0].y);
              ctx.lineTo(p.x+r*lb.ps[i][1].x, p.y+r*lb.ps[i][1].y);
              ctx.moveTo(p.x+r*lb.ps[i][1].x, p.y+r*lb.ps[i][1].y);
              ctx.closePath();
              ctx.stroke();
            }
          }
        }
        if(lb.visual.highlightShown){
          ctx.lineWidth = lb.lineCols.length*lb.visual.objectDimensions + (lb.lineCols.length-1)*lb.visual.gapSize;
          ctx.setLineDash = ([]);
          ctx.strokeStyle = lb.visual.highlightColor;
          ctx.beginPath();
          let p = lb.ps[0];
          ctx.moveTo(p[0].x, p[0].y);
          for(let i = 1; i < lb.ps.length; i++){
            p = lb.ps[i];
            ctx.lineTo(p[0].x, p[0].y);
            ctx.closePath();
            ctx.stroke();
          }
        }
        if(lb.visual.labelShown){
          ctx.font = lb.visual.labelSize + "px Arial";
          ctx.fillStyle = lb.visual.labelColor;
          if(lb.visual.labelPosition == "top") p.y -= 10;
          ctx.fillText(lb.visual.labelText, p.x, p.y);
        }
      },
      dupe: (lb, ver) => {
        let ps = [];
        for(let p of lb.ps) ps.push([ver.objectStore.objects[p[0].id], {x: p[1].x, y: p[1].y}])
        let lineCols = [];
        for(let c of lb.lineCols) lineCols.push(c);
        ver.objectStore.idCounter = lb.id;
        let lb2 = Geometry.objTypes.LineBundle.constr(ver, ver.graphs.cG.edges[lb.e.id], lb.sOrient, lb.tOrient, lineCols);
        lb2.ps = ps;
        let others = Util.cloneDict(ver, lb, ["verID", "e", "s", "sOrient", "tOrient", "lineCols", "ps", "expandedStations", "draw", "dupe", "asString"]);
        for(let x in others) lb2[x] = others[x];
        return lb2;
      }
    },
    Point: {
      constr: (ver, x, y, isHelpPoint = false) => {
        let p = Geometry.objTypes.GeoObject.constr(ver);
        p.objType = "Point";
        p.x = 1*x;
        p.y = 1*y;
        p.visual.objectShape = "rectangle";
        p.visual.objectDimensions = {w: 5, h: 5};
        p.isHelpPoint = isHelpPoint;
        if(!isHelpPoint) Geometry.addGeoObject(ver, p);
        return p;
      },
      draw: (p, ctx) => {
        let w = p.visual.objectDimensions.w;
        let h = p.visual.objectDimensions.h;
        let l = p.visual.highlightSize;
        if(p.visual.highlightShown){
          ctx.fillStyle = p.visual.highlightColor;
          let p2 = Canvas.coordsToPixel(p.x, p.y);
          if(p.visual.objectShape == "rectangle") ctx.fillRect(p2.x-(w+l)/2, p2.y-(h+l)/2, w+l, h+l);
        }
        if(p.visual.objectShown){
          ctx.fillStyle = p.visual.objectColor;
          let p2 = Canvas.coordsToPixel(p.x, p.y);
          if(p.visual.objectShape == "rectangle") ctx.fillRect(p2.x-w/2, p2.y-h/2, w, h);
        }
        if(p.visual.labelShown){
          ctx.font = p.visual.labelSize + "px Arial";
          ctx.fillStyle = p.visual.labelColor;
          let p2 = Canvas.coordsToPixel(p.x, p.y);
          if(p.visual.labelPosition == "top") p2.y -= 10;
          ctx.fillText(p.visual.labelText, p2.x, p2.y);
        }
      },
      dupe: (p, ver) => {
        ver.objectStore.idCounter = p.id;
        let p2 = Geometry.objTypes.Point.constr(ver, p.x, p.y, p.isHelpPoint);
        let others = Util.cloneDict(ver, p, ["verID", "v", "x", "y", "isHelpPoint", "draw", "dupe", "asString"]);
        for(let x in others) p2[x] = others[x];
        return p2;
      }
    },
    LineSegment: {
      constr: (ver, s, t, x2, y2) => {
        let ls = Geometry.objTypes.GeoObject.constr(ver);
        ls.objType = "LineSegment";
        if(s.objType && s.objType == "Point"){
          ls.s = s;
          ls.t = t;
        }else{
          ls.s = Geometry.objTypes.Point.constr(ver, s, t, true);
          ls.t = Geometry.objTypes.Point.constr(ver, x2, y2, true);
        }
        ls.visual.objectStroke = "line";
        ls.visual.objectDimensions = 1;
        ls.visual.arrowShown = false;
        ls.visual.arrowDimensions = {w: Math.PI*0.15, h: 15};
        ls.visual.arrowShape = "lines";
        Geometry.addGeoObject(ver, ls);
        return ls;
      },
      draw: (ls, ctx) => {
        let b;
        let b2;
        let p = Canvas.coordsToPixel(ls.s.x, ls.s.y);
        let p2 = Canvas.coordsToPixel(ls.t.x, ls.t.y);
        if(ls.visual.arrowShown){
          let d = Geometry.distanceBetween(p, p2);
          let f = (d - ls.visual.arrowDimensions.h)/d;
          let a = {x: p.x + (p2.x - p.x)*f, y: p.y + (p2.y - p.y)*f};
          b = Geometry.rotatePointAround(a, p2, ls.visual.arrowDimensions.w);
          b2 = Geometry.rotatePointAround(a, p2, -ls.visual.arrowDimensions.w);
        }

        if(ls.visual.highlightShown){
          ctx.lineWidth = ls.visual.objectDimensions + ls.visual.highlightSize;
          ctx.strokeStyle = ls.visual.highlightColor;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          if(ls.visual.arrowShown){
            if(ls.visual.arrowShape == "lines"){
              ctx.moveTo(b.x, b.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.moveTo(b2.x, b2.y);
              ctx.lineTo(p2.x, p2.y);
            }
          }
          ctx.closePath();
          ctx.stroke();
        }
        if(ls.visual.objectShown){
          ctx.lineWidth = ls.visual.objectDimensions;
          ctx.strokeStyle = ls.visual.objectColor;
          if(ls.visual.objectStroke = "line") ctx.setLineDash = ([]);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          if(ls.visual.arrowShown){
            if(ls.visual.arrowShape == "lines"){
              ctx.moveTo(b.x, b.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.moveTo(b2.x, b2.y);
              ctx.lineTo(p2.x, p2.y);
            }
          }
          ctx.closePath();
          ctx.stroke();
        }
        if(ls.visual.labelShown){
          ctx.font = ls.visual.labelSize + "px Arial";
          ctx.fillStyle = ls.visual.labelColor;
          if(ls.visual.labelPosition == "top") p.y -= 10;
          ctx.fillText(ls.visual.labelText, p.x, p.y);
        }
      },
      dupe: (ls, ver) => {
        ver.objectStore.idCounter = ls.id;
        let ls2 = Geometry.objTypes.LineSegment.constr(ver, ver.objectStore.objects[ls.s.id], ver.objectStore.objects[ls.t.id]);
        let others = Util.cloneDict(ver, ls, ["verID", "s", "t", "draw", "dupe", "asString"]);
        for(let x in others) ls2[x] = others[x];
        return ls2;
      }
    },
  },
  ptDistSquared: (a, b) => {
    return (a.x-b.x)**2 + (a.y-b.y)**2;
  },
  distanceBetween: (a, b) => {
    if((a.objType == "Point" && b.objType == "Point") || (a.x && a.y && b.x && b.y)) return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2); // a and b are points
    else if(a.objType == "Point" || b.objType == "Point"){
      if(b.objType == "Point"){
        let c = a;
        a = b;
        b = c;
      }
      if(b.objType == "LineSegment"){// src: https://stackoverflow.com/a/1501725
        let l2 = (b.s.x - b.t.x)**2 + (b.s.y - b.t.y)**2;
        if (l2 == 0) return (a.x - b.s.x)**2 + (a.y - b.s.y)**2;
        let t = ((a.x - b.s.x) * (b.t.x - b.s.x) + (a.y - b.s.y) * (b.t.y - b.s.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        let c = Geometry.objTypes.Point.constr(Version.store[a.verID], b.s.x + t * (b.t.x - b.s.x), b.s.y + t * (b.t.y - b.s.y), true);
        return Geometry.distanceBetween(a, c);
        // if(b.s.x == b.t.x){
        //   if(Math.min(b.s.y, b.t.y) < a.y && a.y < Math.max(b.s.y, b.t.y)) return Math.abs(a.x - b.s.x); // b is vertical LS with point a in y-intervall
        //   else return Math.min(distanceBetween(a, b.s), distanceBetween(a, b.t)); // b is vertical LS with point a outside y-intervall
        // }else{
        //   let m = (b.s.y-b.t.y)/(b.s.x-b.t.x);
        //   let cx = (b.s.y-m*b.s.x-a.y-a.x/m)/(-1/m-m);
        //   let cy = m*cx+b.s.y-m*b.s.x;
        //   let c = Geometry.objTypes.Point.constr(cx, cy, true);
        //   let dst = distanceBetween(b.s, b.t);
        //   let dcs = distanceBetween(c, b.s);
        //   let dct = distanceBetween(c, b.t);
        //   if(dst > dcs && dst > dct) return distanceBetween(a, c); // b is non-vertical LS with point a in y-intervall
        //   else return Math.min(dcs, dct); // b is non-vertical LS with point a outside y-intervall
        // }
      }
    }
  }, 
  angleABC: (a, b, c) => {
    let ab = {x: b.x-a.x, y: b.y-a.y};
    let cb = {x: b.x-c.x, y: b.y-c.y};
    let ang = Math.atan2(cb.y, cb.x) - Math.atan2(ab.y, ab.x);
    if (ang < 0) ang += 2 * Math.PI;
    return ang;
  }, 
  rotatePointAround: (a, c, phi) => {
    let sinPhi = Math.sin(phi);
    let cosPhi = Math.cos(phi);
    let a2 = {x: a.x - c.x, y: a.y - c.y};
    let a3 = {x: a2.x * cosPhi - a2.y * sinPhi + c.x, y: a2.x * sinPhi + a2.y * cosPhi + c.y};
    return a3;
  }
};

var MetroMap = {
  location: "wurzburg",
  edgeOrderPrios: {posStation: 1, strEdge: 2},
  Post: {
    updateDijkstras: (ver, newDijkstras, updateLD = true) => {
      ver.results.resultDijkstras = ver.results.resultDijkstras.filter(e => ver.graphs.cG.edges[e[4].id] && !newDijkstras.some(e2 => e2[4].id == e[4].id));
      // console.log("after removing " + newDijkstras.length + " we got " + ver.results.resultDijkstras.length);
      for(let d of newDijkstras) ver.results.resultDijkstras.push(d);
      if(updateLD) MetroMap.Post.makeLineDrawing(ver, [newDijkstras.some(e => !e[0]), ver.results.resultDijkstras]);
    },
    localSearchStepAll: (ver, downloadImg = false) => {
      if(!ver) ver = Version.current;
      let g = ver.graphs.cG;
      let cost = MetroMap.Post.recalcCost(ver);
      sT = Date.now();
      let factorCombinations = [[0, 0], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
      let movedCounter = 0;
      //costs["candidateRadius"] = 0;
      for(let v in ver.graphs.cG.vertices){
        v = ver.graphs.cG.vertices[v];
        // v.p.visual.objectDimensions = {w:8, h:8}
        let locCost = Number.MAX_SAFE_INTEGER;
        let startPos = {i: v.gridNode.gridCoords.i, j: v.gridNode.gridCoords.j};
        let bestPos = startPos;
        let startP = {x: v.gridNode.p.x, y: v.gridNode.p.y};

        movesLoop: for(let i = 0; i < 9; i++){
          if((ver.routeSettings.positionedStations[v.id]||v.es.some(e => ver.routeSettings.frozenEdges[e.id])) && i > 0) continue;
          MetroMap.Routing.unsettleVtx(v);
          let gn = ver.graphs.gridG.gridNodes[startPos.i+factorCombinations[i][0]][startPos.j+factorCombinations[i][1]];
          if(gn.origStation) continue;
          // v.p.x = gn.p.x;
          // v.p.y = gn.p.y;
          if(!MetroMap.Routing.routeEdgeSearch(ver, v, gn, false)) continue;
          // let newDijkstras = [];
          // v.es.sort((a, b) => a.edgeOrderIndex - b.edgeOrderIndex);
          // for(let e of v.es){
          //   newDijkstras.push(MetroMap.Routing.routeEdgeSearch(ver, e, e.s.id == v.id ? gn : false, e.t.id == v.id ? gn : false));
          //   if(!newDijkstras[newDijkstras.length-1][0]) continue movesLoop;
          // }
          // MetroMap.Post.updateDijkstras(ver, newDijkstras, false);
          // let newCost = ver.results.resultDijkstras.reduce((acc, dijkstra) => acc + dijkstra[1], 0);
          //let newCost = newDijkstras.reduce((acc, dijkstra) => acc + dijkstra[1], 0);
          let newCost = MetroMap.Post.recalcCost(ver);
          if(newCost < locCost){
            locCost = newCost;
            bestPos = gn.gridCoords;
          }
        }

        // console.log("IDS: ",v.gridNode.id, ver.graphs.gridG.gridNodes[startPos.i][startPos.j].id)
        MetroMap.Routing.unsettleVtx(v);
        // let newDijkstras = [];     
        let gn = ver.graphs.gridG.gridNodes[bestPos.i][bestPos.j];
        if(!MetroMap.Routing.routeEdgeSearch(ver, v, gn, true)) console.error("best option couldnt route edge");
        // v.es.sort((a, b) => a.edgeOrderIndex - b.edgeOrderIndex);
        // let first = true;
        // for(let e of v.es){
        //   newDijkstras.push(MetroMap.Routing.routeEdgeSearch(ver, e, first && e.s.id == v.id ? gn : false, first && e.t.id == v.id ? gn : false));
        //   if(!newDijkstras[newDijkstras.length-1][0]){console.warn("pos reset failed!");break;}
        //   first = false;
        // }
        // if(!newDijkstras[newDijkstras.length-1][0]) console.error("best option couldnt route edge");
        // MetroMap.Post.updateDijkstras(ver, newDijkstras, true);//v.id == ver.results.vertexOrder[ver.results.vertexOrder.length-1].id);
        
        if(bestPos.i != startPos.i || bestPos.j != startPos.j){
          movedCounter++;
          gn.p.visual.objectColor = "lime";
        }
      }
      
      let newCost = MetroMap.Post.recalcCost(ver);
      Version.current.results.calcTime = Date.now()-sT;
      Version.current.results.cost = newCost;
      console.log("Finished search all step in " + (Date.now()-sT) + "ms, improved by " + (cost-newCost));
      return newCost;
    },
    localSearchStep: (ver, downloadImg = false) => {
      if(!ver) ver = Version.current;
      let g = ver.graphs.cG;
      let cost = MetroMap.Post.recalcCost(ver);
      sT = Date.now();
      let factorCombinations = [[0, 0], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
      let minCost = cost;
      let movedV, movedP;
      //costs["candidateRadius"] = 0;
      for(let v in ver.graphs.cG.vertices){
        v = ver.graphs.cG.vertices[v];
        // v.p.visual.objectDimensions = {w:8, h:8}
        let locCost = Number.MAX_SAFE_INTEGER;
        let bestPos;
        let startPos = {i: v.gridNode.gridCoords.i, j: v.gridNode.gridCoords.j};
        let startP = {x: v.gridNode.p.x, y: v.gridNode.p.y};

        movesLoop: for(let i = 0; i < 9; i++){
          if((ver.routeSettings.positionedStations[v.id]||v.es.some(e => ver.routeSettings.frozenEdges[e.id])) && i > 0) continue;
          MetroMap.Routing.unsettleVtx(v);
          let gn = ver.graphs.gridG.gridNodes[startPos.i+factorCombinations[i][0]][startPos.j+factorCombinations[i][1]];
          if(gn.origStation) continue;
          // v.p.x = gn.p.x;
          // v.p.y = gn.p.y;
          if(!MetroMap.Routing.routeEdgeSearch(ver, v, gn, false)) continue;
          // let newDijkstras = [];
          // v.es.sort((a, b) => a.edgeOrderIndex - b.edgeOrderIndex);
          // for(let e of v.es){
          //   newDijkstras.push(MetroMap.Routing.routeEdgeSearch(ver, e, e.s.id == v.id ? gn : false, e.t.id == v.id ? gn : false));
          //   if(!newDijkstras[newDijkstras.length-1][0]) continue movesLoop;
          // }
          // MetroMap.Post.updateDijkstras(ver, newDijkstras, false);
          // let newCost = ver.results.resultDijkstras.reduce((acc, dijkstra) => acc + dijkstra[1], 0);
          //let newCost = newDijkstras.reduce((acc, dijkstra) => acc + dijkstra[1], 0);
          let newCost = MetroMap.Post.recalcCost(ver);
          if(newCost < locCost){
            locCost = newCost;
            bestPos = gn.gridCoords;
          }
        }

        // console.log("IDS: ",v.gridNode.id, ver.graphs.gridG.gridNodes[startPos.i][startPos.j].id)
        MetroMap.Routing.unsettleVtx(v);
        // let newDijkstras = [];
        let gn = ver.graphs.gridG.gridNodes[startPos.i][startPos.j];
        // console.log(startPos, v)
        if(!MetroMap.Routing.routeEdgeSearch(ver, v, gn, true)) {console.warn("pos reset failed!"); gn.p.highlightShown = true;}
        // v.es.sort((a, b) => a.edgeOrderIndex - b.edgeOrderIndex);
        // let first = true;
        // for(let e of v.es){
        //   newDijkstras.push(MetroMap.Routing.routeEdgeSearch(ver, e, first && e.s.id == v.id ? gn : false, first && e.t.id == v.id ? gn : false));
        //   if(!newDijkstras[newDijkstras.length-1][0]){console.warn("pos reset failed!");break;}
        //   first = false;
        // }
        // if(!newDijkstras[newDijkstras.length-1][0]) return cost;
        // MetroMap.Post.updateDijkstras(ver, newDijkstras, false);
        // let oldCost = ver.results.resultDijkstras.reduce((acc, dijkstra) => acc + dijkstra[1], 0); TODO Why does this change so much?
        // //let oldCost = newDijkstras.reduce((acc, dijkstra) => acc + dijkstra[1], 0);
        // console.log(locCost, " vs old: ", oldCost)
        if(locCost < minCost){
          minCost = locCost;
          movedV = v;
          movedP = bestPos;
        }
      }

      if(movedV){
        MetroMap.Routing.unsettleVtx(movedV);
        let gn = ver.graphs.gridG.gridNodes[movedP.i][movedP.j];
        if(!MetroMap.Routing.routeEdgeSearch(ver, movedV, gn, true)) console.warn("best routing failed!");
        // let newDijkstras = [];
        // for(let e of movedV.es){
        //   newDijkstras.push(MetroMap.Routing.routeEdgeSearch(ver, e, e.s.id == movedV.id ? gn : false, e.t.id == movedV.id ? gn : false));
        // }    
        // MetroMap.Post.updateDijkstras(ver, newDijkstras);
        // for(let v of ver.results.vertexOrder) v.gridNode.p.visual.objectShown = true;
        movedV.gridNode.p.visual.objectColor = "lime";
      }

      let newCost = MetroMap.Post.recalcCost(ver);
      Version.current.results.calcTime = Date.now()-sT;
      Version.current.results.cost = newCost;
      console.log("Finished search step in " + (Date.now()-sT) + "ms, improved by " + (cost-newCost));
      return newCost;
      // return cost-minCost;
    },
    
    recalcCost: (ver) => {
      let bendCosts = [null, ver.costs.c45, ver.costs.c90, ver.costs.c135, ver.costs.c180, ver.costs.c135, ver.costs.c90, ver.costs.c45];
      let g = ver.graphs.cG; //TODO mb use mg (after reinserting contracted stations)
      let c = 0;
      for(let v in g.vertices){
        v = g.vertices[v];
        c += Geometry.distanceBetween(v.p, v.gridNode.p)*(ver.costs.ch+ver.costs.cm)/ver.graphs.gridG.D;
        for(let i = 0; i < v.es.length; i++){
          let p1 = v.gridNode.ports.indexOf(v.es[i].path[0].id == v.gridNode.id ? v.es[i].path[1] : v.es[i].path[v.es[i].path.length-2]);
          for(let j = i+1; j < v.es.length; j++){
            if(!v.es[j].path) console.log(v.es[j])
            let p2 = v.gridNode.ports.indexOf(v.es[j].path[0].id == v.gridNode.id ? v.es[j].path[1] : v.es[j].path[v.es[j].path.length-2]);
            c += bendCosts[Math.max(p1, p2) - Math.min(p1, p2)];
            // console.log(p1, p2, bendCosts[Math.max(p1, p2) - Math.min(p1, p2)])
          }
        }
      }
      for(let e in g.edges){
        c += 2*ver.costs.cs+ver.costs.ch;
        e = g.edges[e];
        for(let i = 2; i < e.path.length-2; i+=2){
          if(!e.path[i].parent) console.warn("trying to get ports badly", e, e.path[i])
          let p1 = e.path[i].parent.ports.indexOf(e.path[i]);
          let p2 = e.path[i].parent.ports.indexOf(e.path[i+1]);
          // console.log(bendCosts[Math.max(p1, p2) - Math.min(p1, p2)])
          c += bendCosts[Math.max(p1, p2) - Math.min(p1, p2)] + ver.costs.ch;
        }
        if(e.chain && e.chain.length > 1){
          let k = e.chain.length-1;
          let l = (e.edgePath.length-1)/2;
          if(k+1 > l){
            let springF = (ver.costs.cc*((k+1-l)**2))/(2*k);
            c += springF;
            // console.log(e.id,k,l,springF)
          }
        }
      }
      ver.results.cost = c;
      return c;
    },
    updateTimeOut: (ver, success, time, cost = null, change) => {
      if(!cost) cost = MetroMap.Post.recalcCost(ver);
      ver.results.cost = cost;
      ver.results.calcTime = time;
      document.getElementById("timeOut").innerText = (success?"Finished in ":"Failed after ") + time + "ms with cost " + (Math.round(cost*100)/100);
      if(change) document.getElementById("timeOut").innerText += (change>0?" (worse by ":" (better by ") + (Math.round(Math.abs(change)*100)/100) + ")";
    },
    makeLineDrawing: (ver, result, objectsShown = ver.checkBoxes.cbShowLineDrawing) => {
      if(ver.results.lineDrawing){
        for(let s of ver.results.lineDrawing[0]) Geometry.removeGeoObject(ver, s);
        for(let lb of ver.results.lineDrawing[1]){
          if(lb.expandedStations) for(let s of lb.expandedStations) Geometry.removeGeoObject(ver, s);
          Geometry.removeGeoObject(ver, lb);
        }
      }
      if(result[0]) return;
      let dijkstras = result[1]; 
      ver.results.lineDrawing = [[], []];
      lineCols = ["red", "blue", "green", "orange", "black", "purple", "yellow", "brown", "cyan", "salmon", "lime", "pink"];
      for(let d of dijkstras){
        if(d[2][0].station) delete d[2][0].station;
        if(d[2][d[2].length-1].station) delete d[2][d[2].length-1].station;
      }
      for(let d of dijkstras){
        let sOrient, tOrient;
        //if(d[4].s.es.length == 1) 
        sOrient = (d[2][0].ports.indexOf(d[2][1])+4)%8;
  //      else sOrient = 0;
        tOrient = (d[2][d[2].length-1].ports.indexOf(d[2][d[2].length-2])+4)%8;
        // sOrient = 0;
        // tOrient = 0;
        d[4].lb = Geometry.objTypes.LineBundle.constr(ver, d[4], sOrient, tOrient, d[4].lines.map(x => lineCols[x]));
        d[4].lb.visual.objectShown = objectsShown;
        if(d[4].lb.expandedStations) for(let s of d[4].lb.expandedStations) s.visual.objectShown = objectsShown;
        ver.results.lineDrawing[1].push(d[4].lb);
      }
      for(let d of dijkstras){
        if(!d[2][0].station){
          d[2][0].station = Geometry.objTypes.Station.constr(ver, d[2][0]);
          d[2][0].station.visual.objectShown = objectsShown;
          ver.results.lineDrawing[0].push(d[2][0].station);
        }
        if(!d[2][d[2].length-1].station){
          d[2][d[2].length-1].station = Geometry.objTypes.Station.constr(ver, d[2][d[2].length-1]);
          d[2][d[2].length-1].station.visual.objectShown = objectsShown;
          ver.results.lineDrawing[0].push(d[2][d[2].length-1].station);
        }
      }
    }
  },
  Routing: {
    getEdgeOrder: (g, startVtx) => {
      let eO = [];
      let dangling = [];
      let unprocessed = [];
      let eoi = 0;
      let vertexOrder = [];
      let maxLDegV = g.vertices[0];
      for(let v in g.vertices){
        v = g.vertices[v];
        if(!startVtx || v.id != startVtx.id) unprocessed.push(v);
        v.edgeOrderingStatus = "unprocessed";
        // v.settled = false;
        if(!startVtx && v.contractParent.ldeg > maxLDegV.contractParent.ldeg) maxLDegV = v;
      }
        
      unprocessed.sort((a, b) => a.ldeg-b.ldeg);
      let v1 = startVtx ? startVtx : maxLDegV;
      if(!startVtx) unprocessed.splice(unprocessed.indexOf(maxLDegV), 1);
      dangling.push(v1);
      v1.edgeOrderingStatus = "dangling";
      dangling.sort((a, b) => a.ldeg-b.ldeg);
      while(dangling.length > 0){
        v1 = dangling.pop();
        vertexOrder.push(v1);
        let edgesToAdd = [];
        for(let e of v1.es) if(Util.Edge.v2(e, v1).edgeOrderingStatus != "processed") edgesToAdd.push(e);
        edgesToAdd.sort((a, b) => Util.Edge.v2(b, v1).ldeg-Util.Edge.v2(a, v1).ldeg);
        for(let e of edgesToAdd){
          e.edgeOrderIndex = eoi++;
          eO.push(e);
          Util.Edge.v2(e, v1).edgeOrderingStatus = "dangling";
          unprocessed.splice(unprocessed.indexOf(Util.Edge.v2(e, v1)), 1);
          dangling.push(Util.Edge.v2(e, v1));
        }
        dangling.sort((a, b) => a.ldeg-b.ldeg);
        v1.edgeOrderingStatus = "processed";
      }
      if(unprocessed.length > 0)  console.log("G wasn't connected, didn't finish edge ordering (TODO)");
      return [eO, vertexOrder];
    },
    recalcEdgeOrder: (ver) => {
      let eoPrios = {};
      let [eO, vO] = MetroMap.Routing.getEdgeOrder(ver.graphs.cG);
      let groups = {};
      for(let i = 0; i < eO.length; i++){
        let e = eO[i];
        if(ver.routeSettings.frozenEdges[e.id]){
          if(!groups[ver.routeSettings.frozenEdges[e.id].groupID]) groups[ver.routeSettings.frozenEdges[e.id].groupID] = [];
          groups[ver.routeSettings.frozenEdges[e.id].groupID].push(e);
          continue;
        }
        let p = 1-i/eO.length;
        if(ver.routeSettings.positionedStations[e.s.contractParent.id]) p += MetroMap.edgeOrderPrios.posStation;
        if(ver.routeSettings.positionedStations[e.t.contractParent.id]) p += MetroMap.edgeOrderPrios.posStation;
        if(ver.routeSettings.straightEdges.some(se => se.length == e.chain.length && se.every(e2 => e.chain.includes(e2)))) p += MetroMap.edgeOrderPrios.strEdge;

        // if(!ver.routeSettings.frozenEdges[e.id]) p += 5;
        eoPrios[eO[i].id] = p;
      }
      // console.log(groups)
      for(let gr in groups){
        gr = groups[gr];
        let i = 1;
        while(gr.length > 0){
          let maxP = Number.MIN_SAFE_INTEGER;
          let maxE;
          for(let e of gr){
            for(let e2 of e.s.es){
              if(eoPrios[e2.id] && eoPrios[e2.id] > maxP){
                maxP = eoPrios[e2.id];
                maxE = e;
              }
            }
            for(let e2 of e.t.es){
              if(eoPrios[e2.id] && eoPrios[e2.id] > maxP){
                maxP = eoPrios[e2.id];
                maxE = e;
              }
            }
          }
          gr.splice(gr.indexOf(maxE), 1)
          eoPrios[maxE.id] = maxP - (i/(gr.length+2))/eO.length;
          i++;
        }
      }
      // console.log(ver.results.edgeOrder)
      ver.results.edgeOrder = eO;
      ver.results.edgeOrder.sort((a, b) => eoPrios[b.id] - eoPrios[a.id]);
      ver.results.vertexOrder = vO; //TODO maybe sort smarter
      // let s = "";
      // for(let e of ver.results.edgeOrder) s += e.id +"(" + eoPrios[e.id] + ")\t"
      // console.log(s)
      return eoPrios;
    },
    recalcAll: (ver) => {
      // console.log(ver.costs.c90);
      sT = Date.now();
      if(!ver) ver = Version.current;
      if(Writing.measurePerformance) Writing.times.s = performance.now();
      MetroMap.Routing.recalcCG(ver);
      let g = Version.current.graphs.cG;
      let es = [];
      for(let e in g.edges) es.push(g.edges[e]);

      let failed = !MetroMap.Routing.routeEdges(ver, es);

      // [ver.results.edgeOrder, ver.results.vertexOrder] = MetroMap.Routing.getEdgeOrder(ver.graphs.cG);

      // delete ver.graphs.gridG.s2sDijkstraIDSortedVtcs;
      // // MetroMap.Post.updateDijkstras(ver, dijkstras);
      // if(failed) ver.results.resultDijkstras = null;
      // else ver.results.resultDijkstras = dijkstras;

      // MetroMap.Post.makeLineDrawing(ver, [failed, dijkstras]);

      // Canvas.redraw();
      // let cost = MetroMap.Post.recalcCost(ver);//dijkstras.reduce((acc, dijkstra) => acc + dijkstra[1], 0);
      // MetroMap.Post.updateTimeOut(ver, !failed, Date.now()-sT, cost);


      // ver.results.cost = cost;
      // ver.results.calcTime = Date.now()-sT;
      // document.getElementById("timeOut").innerText = (failed ? "Failed" : "Finished") + " in " + (Date.now()-sT) + "ms with cost " + cost;
      document.getElementById("canvas").focus();
      // if(ver.versionIndex > 0 && ver.isCurrent){ 
      //   let costChanges = [];
      //   let hi = -1;
      //   for(let i = 0; i < Version.history.length && hi == -1; i++) if(Version.history[i].includes(Version.store[ver.versionIndex])) hi = i;
      //   console.log(hi)
      //   for(let c in Version.history[hi-1][0].costs) costChanges.push([Version.history[hi-1][0].costs[c]-ver.costs[c], c]);
      //   // console.log(costChanges)
      //   let s = "";
      //   for(let cc of costChanges) if(cc[0] != 0) s += (cc[0]>0?"Decreased " : "Increased ") + cc[1] + ", ";
      //   if(s.length > 0) Version.edited("Changed Cost: " + s.substring(0, s.length-2));
      // }
      //TODO make cost changes cooperate with other edits
      return !failed;
    },
    recalcCG: (ver) => {
      let feEntries = [];
      for(let fe in ver.routeSettings.frozenEdges) feEntries.push({sid: ver.graphs.cG.edges[fe].s.contractParent.id, tid: ver.graphs.cG.edges[fe].t.contractParent.id, val: ver.routeSettings.frozenEdges[fe]});
      for(let v in ver.graphs.cG.vertices){
        MetroMap.Routing.unsettleVtx(ver.graphs.cG.vertices[v]);
        for(let e of ver.graphs.cG.vertices[v].es) e.skipUnsettle = true;
      }
      for(let v in ver.graphs.cG.vertices){//might be unecessary
        for(let e of ver.graphs.cG.vertices[v].es) e.skipUnsettle = undefined;
      }
      Util.Graph.removeAll(ver.graphs.cG);
      ver.graphs.cG = MetroMap.GraphCreation.deg2Contract(ver, ver.graphs.mG);
      for(let v in ver.routeSettings.movedInputs) if(ver.graphs.mG.vertices[v].contract.v){
        ver.graphs.mG.vertices[v].contract.v.p.x = ver.routeSettings.movedInputs[v].x;
        ver.graphs.mG.vertices[v].contract.v.p.y = ver.routeSettings.movedInputs[v].y;
      }
      let fes = {};
      for(let fe of feEntries){
        let eid;
        for(let e in ver.graphs.cG.edges){
          e = ver.graphs.cG.edges[e];
          if((fe.sid == e.s.contractParent.id && fe.tid == e.t.contractParent.id) || (fe.sid == e.t.contractParent.id && fe.tid == e.s.contractParent.id)){
            eid = e.id;
            break;
          }
        }
        fes[eid] = fe.val;
      }
      ver.routeSettings.frozenEdges = fes;
    },
    unsettleVtx: (v) => {
      // console.log("unselttl")
      v.settled = false;
      if(v.gridNode){
        v.gridNode.origStation = undefined;
        v.gridNode.settleable = true;
        v.gridNode.p.visual.objectShown = false; //TODO maybe reset visuals
        v.gridNode.p.visual.objectDimensions = {w: 5, h: 5};
      }
      // if(v.ver.graphs.mGToGridConnectors) Geometry.removeGeoObject(ver, v.ver.graphs.mGToGridConnectors);
      v.gridNode = undefined;
      for(let e of v.es){
        // console.log("unsettling edge ", e.id)
        if(e.skipUnsettle) continue;
        let esToReset = [];
        e.settled = false;
        e.sPortUsed = undefined;
        e.tPortUsed = undefined;
        if(!e.edgePath) continue;
        for(let e2 of e.edgePath){
          if(e2.ls){
            e2.ls.visual.objectShown = false;
            e2.ls = undefined;
          }
          esToReset.push(e2);
          e2.origEdge = undefined;
          for(let e3 of e2.blockedDiagonals) esToReset.push(e3);
          e2.blockedDiagonals = undefined;
        }
        for(let e2 of e.path[0].es){
          esToReset.push(e2);
        }
        for(let p of e.path[0].ports){
          for(let e2 of p.es){
            if(e2.occupiedStatusDict[e.id]) esToReset.push(e2);
          }
        }
        for(let i = 2; i < e.path.length-2; i += 2){
          let u = e.path[i];
          if(!u.ports){
            u = u.parent;
            u.settleable = true;
            for(let p of u.ports){
              for(let e2 of p.es) if(e2.occupiedStatusDict[e.id]) esToReset.push(e2);
            }
          }
        }
        for(let e2 of e.path[e.path.length-1].es){
          esToReset.push(e2);
        }
        for(let p of e.path[e.path.length-1].ports){
          for(let e2 of p.es){
            if(e2.occupiedStatusDict[e.id]) esToReset.push(e2);
          }
        }

        for(let e2 of esToReset){
          delete e2.occupiedStatusDict[e.id];
          let maxOS = 0;
          for(let os in e2.occupiedStatusDict){
            if(e2.occupiedStatusDict[os] > maxOS) maxOS = e2.occupiedStatusDict[os];
            if(maxOS == 2) break;
          }
          e2.occupiedStatus = maxOS;
        }
        e.edgePath = undefined;
        e.path = undefined;
      }
    },
    edgeAngle: (a, b, c, e, e2) => {
      if(e.chain){
        let a2, c2;
        if(e.chain[0].s.contract.v && e.chain[0].s.contract.v.id == b.id) a2 = e.chain[0].t;
        else if(e.chain[0].t.contract.v && e.chain[0].t.contract.v.id == b.id) a2 = e.chain[0].s;
        else if(e.chain[e.chain.length-1].t.contract.v && e.chain[e.chain.length-1].t.contract.v.id == b.id) a2 = e.chain[e.chain.length-1].s;
        else if(e.chain[e.chain.length-1].s.contract.v && e.chain[e.chain.length-1].s.contract.v.id == b.id) a2 = e.chain[e.chain.length-1].t;
        else console.warn("thats not how you use this 1");
        if(e2.chain[0].s.contract.v && e2.chain[0].s.contract.v.id == b.id) c2 = e2.chain[0].t;
        else if(e2.chain[0].t.contract.v && e2.chain[0].t.contract.v.id == b.id) c2 = e2.chain[0].s;
        else if(e2.chain[e2.chain.length-1].t.contract.v && e2.chain[e2.chain.length-1].t.contract.v.id == b.id) c2 = e2.chain[e2.chain.length-1].s;
        else if(e2.chain[e2.chain.length-1].s.contract.v && e2.chain[e2.chain.length-1].s.contract.v.id == b.id) c2 = e2.chain[e2.chain.length-1].t;
        else console.warn("thats not how you use this 2");
        return Geometry.angleABC(a2.p, b.p, c2.p);
      }
      else return Geometry.angleABC(a.p, b.p, c.p)
    },
    routeEdge: (ver, e, sCandidate = false, tCandidate = false, frozen = false, objectsShown = ver.checkBoxes.cbShowResult) => {
      let endptsSet = sCandidate&&tCandidate?2:(sCandidate||tCandidate?1:0);
      if(Writing.measurePerformance2) Writing.times.ps[endptsSet].push(-1*performance.now());
      if(frozen){//TODO make a method that checks if the frozen part fits at a certain pos(tersyt for gridsize)
        console.log(frozen, e)
        if(!e.s.settled && !e.t.settled) console.warn("frozen edge with no settled ends getting routed");
        let v1 = e.s.settled ? e.s.gridNode : ver.graphs.gridG.gridNodes[e.t.gridNode.gridCoords.i-frozen.iSTDiff][e.t.gridNode.gridCoords.j-frozen.jSTDiff];
        let v2 = e.t.settled ? e.t.gridNode : ver.graphs.gridG.gridNodes[e.s.gridNode.gridCoords.i+frozen.iSTDiff][e.s.gridNode.gridCoords.j+frozen.jSTDiff];
        console.log("from", v1.gridCoords, "to", v2.gridCoords)
        let path = [v1, v1.ports[frozen.bendToPortSeq[0]]];
        let edgePath = [v1.es.find(e2 => Util.Edge.v2(e2, v1) == path[1])];
        for(let i = 1; i < frozen.bendToPortSeq.length+1; i++){
          let e2 = path[path.length-1].es.find(e3 => Util.Edge.v2(e3, path[path.length-1]).parent && Util.Edge.v2(e3, path[path.length-1]).parent != path[path.length-1].parent);
          edgePath.push(e2);
          path.push(Util.Edge.v2(e2, path[path.length-1]));
          let tp = i < frozen.bendToPortSeq.length ? path[path.length-1].parent.ports[frozen.bendToPortSeq[i]] : v2;
          edgePath.push(path[path.length-1].es.find(e3 => Util.Edge.v2(e3, path[path.length-1]) == tp));
          path.push(tp);
        }
        console.log(path, edgePath)
        if(edgePath[0].occupiedStatus > 1 || edgePath[edgePath.length-1].occupiedStatus > 1) return false;
        for(let i = 1; i < edgePath.length-1; i++) if(edgePath[i].occupiedStatus > 0) return false;
        for(let i = 2; i < path.length-2; i += 2) if(!path[i].parent.settleable) return false;
        return MetroMap.Routing.routeEdgeCleanup(ver, [true, null, path, edgePath], e, [], [], sCandidate, tCandidate, [], [], objectsShown);
      }
      let grid = ver.graphs.gridG;
      // console.log("STARTING ", e, sCandidate?sCandidate.id:sCandidate, tCandidate?tCandidate.id:tCandidate, e.s.settled, e.t.settled)
      let r = (ver.costs.candidateRadius*ver.graphs.gridG.D)**2;
      let tempOpen = [];
      let tempClosed = [];
      let offSet = 1;
      let factorCombinations = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
      let bendCosts = [null, "c45", "c90", "c135", "c180", "c135", "c90", "c45"];

      // let S = sCandidate ? [sCandidate] : [MetroMap.Routing.findClosestGridNode(ver, e.s)];      
      // for(let e2 of S[0].es) e2.costKeys = ["cs", {a: S[0].p, b: e.s.p, l: "S-0"}];
      // S[0].settleable = false;
      // let T = tCandidate ? [tCandidate] : [MetroMap.Routing.findClosestGridNode(ver, e.t)];
      // for(let e2 of T[0].es) e2.costKeys = ["cs", {a: T[0].p, b: e.t.p, l: "T-0"}];
      // S[0].settleable = true;
      // let addedSomething = true;
      // while(addedSomething){
      //   addedSomething = false;
      //   let nodesToTest = [];
      //   for(let i = Math.max(0, S[0].gridCoords.i-offSet); i <= Math.min(grid.gridNodes.length-1, S[0].gridCoords.i+offSet); i++){
      //     let j = S[0].gridCoords.j-offSet;
      //     if(j >= 0) nodesToTest.push(grid.gridNodes[i][j]);
      //     j = S[0].gridCoords.j+offSet;
      //     if(j < grid.gridNodes[0].length) nodesToTest.push(grid.gridNodes[i][j]);
      //   }
      //   for(let j = Math.max(-1, S[0].gridCoords.j-offSet)+1; j <= Math.min(grid.gridNodes[0].length, S[0].gridCoords.j+offSet)-1; j++){
      //     let i = S[0].gridCoords.i-offSet;
      //     if(i >= 0) nodesToTest.push(grid.gridNodes[i][j]);
      //     i = S[0].gridCoords.i+offSet;
      //     if(i < grid.gridNodes.length) nodesToTest.push(grid.gridNodes[i][j]);
      //   }
      //   for(let v of nodesToTest){
      //     if(v.settleable && Geometry.distanceBetween(e.s.p, v.p) < r && (e.t.settled || Geometry.distanceBetween(e.s.p, v.p) <= Geometry.distanceBetween(e.t.p, v.p))){
      //       S.push(v);
      //       for(let e2 of v.es) e2.costKeys = ["cs", {a: v.p, b: e.s.p, l: "S-1"}];
      //       addedSomething = true;
      //     }
      //   }
      //   nodesToTest = [];
      //   for(let i = Math.max(0, T[0].gridCoords.i-offSet); i <= Math.min(grid.gridNodes.length-1, T[0].gridCoords.i+offSet); i++){
      //     let j = T[0].gridCoords.j-offSet;
      //     if(j >= 0) nodesToTest.push(grid.gridNodes[i][j]);
      //     j = T[0].gridCoords.j+offSet;
      //     if(j < grid.gridNodes[0].length) nodesToTest.push(grid.gridNodes[i][j]);
      //   }
      //   for(let j = Math.max(-1, T[0].gridCoords.j-offSet)+1; j <= Math.min(grid.gridNodes[0].length, T[0].gridCoords.j+offSet)-1; j++){
      //     let i = T[0].gridCoords.i-offSet;
      //     if(i >= 0) nodesToTest.push(grid.gridNodes[i][j]);
      //     i = T[0].gridCoords.i+offSet;
      //     if(i < grid.gridNodes.length) nodesToTest.push(grid.gridNodes[i][j]);
      //   }
      //   for(let v of nodesToTest){
      //     if(v.settleable && Geometry.distanceBetween(e.t.p, v.p) < r && (e.s.settled || Geometry.distanceBetween(e.t.p, v.p) < Geometry.distanceBetween(e.s.p, v.p))){
      //       T.push(v);
      //       for(let e2 of v.es) e2.costKeys = ["cs", {a: v.p, b: e.t.p, l: "T-1"}];
      //       addedSomething = true;
      //     }
      //   }
      //   offSet++;
      // }
      

      let S = sCandidate ? [sCandidate] : [];
      let T = tCandidate ? [tCandidate] : [];

      let occupiedPS = [];
      for(let ps in ver.routeSettings.positionedStations) occupiedPS.push(ver.routeSettings.positionedStations[ps]);

      let sDecided = e.s.settled || sCandidate;
      let tDecided = e.t.settled || tCandidate;

      if(!(sDecided && tDecided)) for(let i = 0; i < ver.graphs.gridG.gridNodes.length; i++){
        for(let j = 0; j < ver.graphs.gridG.gridNodes[i].length; j++){
          let v = ver.graphs.gridG.gridNodes[i][j];
          if(sDecided){
            if(v.settleable && !occupiedPS.includes(v) && Geometry.ptDistSquared(e.t.p, v.p) < r){
              T.push(v);
              for(let e2 of v.es) e2.costKeys = ["cs", {a: v.p, b: e.t.p, l: "T-1"}];
            }
          }else if(tDecided){
            if(v.settleable && !occupiedPS.includes(v) && Geometry.ptDistSquared(e.s.p, v.p) < r){
              S.push(v);
              for(let e2 of v.es) e2.costKeys = ["cs", {a: v.p, b: e.s.p, l: "S-1"}];
            }
          }else if(v.settleable && !occupiedPS.includes(v)){
            let sd = Geometry.ptDistSquared(e.s.p, v.p);
            let td = Geometry.ptDistSquared(e.t.p, v.p);
            if(Math.min(sd, td) < r){
              if(sd < td){
                S.push(v);
                for(let e2 of v.es) e2.costKeys = ["cs", {a: v.p, b: e.s.p, l: "S-1"}];
              }else{
                T.push(v);
                for(let e2 of v.es) e2.costKeys = ["cs", {a: v.p, b: e.t.p, l: "T-1"}];
              }
            }
          }
        }
      }

      // console.log(S.length, T.length, S[0].es[0].cost, T[0].es[0].cost)
      if(sCandidate){
        e.s.settled = true;
        e.s.gridNode = sCandidate;
        sCandidate.origStation = e.s;
        sCandidate.settleable = false;
        if(T.includes(sCandidate)) T.splice(T.indexOf(sCandidate), 1);
      }
      if(tCandidate){
        e.t.settled = true;
        e.t.gridNode = tCandidate;
        tCandidate.origStation = e.t;
        tCandidate.settleable = false;
        if(S.includes(tCandidate)) S.splice(S.indexOf(tCandidate), 1);
      }
      if(S.some(v => T.includes(v))) console.error("vtx in both S and T early", S, T, e, sCandidate, tCandidate, e.s.settled, e.t.settled);
      if(tCandidate && S.includes(tCandidate)) console.error("tcan in S", S, T, e, sCandidate, tCandidate, e.s.settled, e.t.settled);
      if(sCandidate && T.includes(sCandidate)) console.error("scan in T", S, T, e, sCandidate, tCandidate, e.s.settled, e.t.settled);
      if(tCandidate && e.s.settled && e.s.gridNode == tCandidate) console.error("tcan is e.s.gn", S, T, e, sCandidate, tCandidate, e.s.settled, e.t.settled);
      if(sCandidate && e.t.settled && e.t.gridNode == sCandidate) console.error("scan is e.t.gn", S, T, e, sCandidate, tCandidate, e.s.settled, e.t.settled);
      if(e.s.settled){
        if(sCandidate) S = [sCandidate];
        else S = [e.s.gridNode];
        for(let e2 of S[0].es) e2.costKeys = ["cs", {a: S[0].p, b: e.s.p, l: "s1"}];
        let v = S[0];
        if(!v.settleable){
          let ps, pt;
          let settledAdj = [];
          for(let e2 of e.s.es) if(e2.settled) settledAdj.push(e2);
          if(settledAdj.length == 0){
            ps = 0;
            pt = 8;
          }else{
            settledAdj.sort((a, b) => MetroMap.Routing.edgeAngle(e.t, e.s, Util.Edge.v2(a, e.s), e, a) - MetroMap.Routing.edgeAngle(e.t, e.s, Util.Edge.v2(b, e.s), e, b));
            pt = (e.s.id == settledAdj[0].s.id) ? settledAdj[0].sPortUsed : settledAdj[0].tPortUsed;
            ps = (e.s.id == settledAdj[settledAdj.length-1].s.id) ? settledAdj[settledAdj.length-1].sPortUsed : settledAdj[settledAdj.length-1].tPortUsed;
            //if(pt <= ps) pt += 8;
            if((e.s.id != settledAdj[0].s.id && e.s.id != settledAdj[0].t.id) || e.s.id != settledAdj[settledAdj.length-1].s.id && e.s.id != settledAdj[settledAdj.length-1].t.id)console.warn("seems wrong")
            let a1 = MetroMap.Routing.edgeAngle(e.t, e.s, Util.Edge.v2(settledAdj[0], e.s), e, settledAdj[0]);
            let a2 = MetroMap.Routing.edgeAngle(e.t, e.s, Util.Edge.v2(settledAdj[settledAdj.length-1], e.s), e, settledAdj[settledAdj.length-1]);
            // console.log("allowed area is " + ps + " - " + pt + "between " + a1 + " and " + a2);
            for(let e2 of e.s.es){
              if(!e2.settled && e2.id != e.id){
                let a3 = MetroMap.Routing.edgeAngle(e.t, e.s, Util.Edge.v2(e2, e.s), e, e2);
                // console.log("a3 = "+ a3)
                if(a3 < a1) pt--;
                else if(a3 > a2) ps++;
              }
            }
            ps = (ps+1)%8;
            pt = (pt+7)%8;
          }
          // console.log("allowed area is now " + ps + " - " + pt)
          for(let e2 of v.es){
            let i = v.ports.indexOf(Util.Edge.v2(e2, v));
            if(i == -1) continue;
            // console.log("aa " + ps + ", " + i + ", "  + pt+ " -> " + ((ps < pt && i >= ps && i <= pt) || (ps > pt && (i >= ps || i <= pt))) +  " and " +  (e2.occupiedStatus == 1))
            if(((ps <= pt && i >= ps && i <= pt) || (ps > pt && (i >= ps || i <= pt))) && e2.occupiedStatus != 2){
              // console.log("coloring S", ps, i, pt)
              // let ls = Geometry.objTypes.LineSegment.constr(v.p, v.ports[i].p);
              // ls.visual.objectColor = "cyan"
              // v.ports[i].p.visual.objectColor = "cyan"
              let c = 0;
              e2.costKeys = ["cs", {a: v.p, b: e.s.p, l: "s2"}];
              for(let e3 of settledAdj){
                psa = (e.s.id == e3.s.id) ? e3.sPortUsed : e3.tPortUsed;
                if(psa > i && !bendCosts[psa-i] || psa <= i && !bendCosts[i-psa]) console.warn("invalid cost key", psa, i, e3, e)
                if(psa > i && ver.costs[bendCosts[psa-i]] < Number.MAX_SAFE_INTEGER) e2.costKeys.push(bendCosts[psa-i]);
                else if(ver.costs[bendCosts[i-psa]] < Number.MAX_SAFE_INTEGER) e2.costKeys.push(bendCosts[i-psa]);
              }
              // console.log("exit "+ i +" got cost " + c)
              // console.log("using bend " + c)
              // console.log(e2.cost)
              // console.log("updatedS")
              // console.log(e2.cost)
              if(e2.occupiedStatus == 1) e2.occupiedStatus = -1;
              tempOpen.push(e2);
            }else if(e2.occupiedStatus == 1){//TODO does this belong here
              tempClosed.push(e2);
              e2.occupiedStatus = 3;
            }
          }
        }//else console.warn("s")
      }
      if(S.some(v => T.includes(v))) console.error("vtx in both S and T mediocre", S, T, e, sCandidate, tCandidate, e.s.settled, e.t.settled);
      if(e.t.settled){
        if(tCandidate) T = [tCandidate];
        else T = [e.t.gridNode];
        for(let e2 of T[0].es) e2.costKeys = ["cs", {a: T[0].p, b: e.t.p, l: "t1"}];
        let v = T[0];
        // if(v.settleable) console.log(e, v )
        if(!v.settleable){
          let ps, pt;
          let settledAdj = [];
          for(let e2 of e.t.es) if(e2.settled) settledAdj.push(e2);
          if(settledAdj.length == 0){
            ps = 0;
            pt = 8;
          }else{
            settledAdj.sort((a, b) => MetroMap.Routing.edgeAngle(e.s, e.t, Util.Edge.v2(a, e.t), e, a) - MetroMap.Routing.edgeAngle(e.s, e.t, Util.Edge.v2(b, e.t), e, b));
            pt = (e.t.id == settledAdj[0].s.id) ? settledAdj[0].sPortUsed : settledAdj[0].tPortUsed;
            ps = (e.t.id == settledAdj[settledAdj.length-1].s.id) ? settledAdj[settledAdj.length-1].sPortUsed : settledAdj[settledAdj.length-1].tPortUsed;
            if((e.t.id != settledAdj[0].s.id && e.t.id != settledAdj[0].t.id) || e.t.id != settledAdj[settledAdj.length-1].s.id && e.t.id != settledAdj[settledAdj.length-1].t.id)console.warn("seems wrong")
            let a1 = MetroMap.Routing.edgeAngle(e.s, e.t, Util.Edge.v2(settledAdj[0], e.t), e, settledAdj[0]);
            let a2 = MetroMap.Routing.edgeAngle(e.s, e.t, Util.Edge.v2(settledAdj[settledAdj.length-1], e.t), e, settledAdj[settledAdj.length-1]);
            // console.log("allowed area is " + ps + " - " + pt + "between " + a1 + " and " + a2);
            for(let e2 of e.t.es){
              if(!e2.settled && e2.id != e.id){
                let a3 = MetroMap.Routing.edgeAngle(e.s, e.t, Util.Edge.v2(e2, e.t), e, e2);
                // console.log("a3 = "+ a3)
                if(a3 < a1) pt--;
                else if(a3 > a2) ps++;
              }
            }
            ps = (ps+1)%8;
            pt = (pt+7)%8;
            // console.log("allowed area is now " + ps + " - " + pt)
          }
          for(let e2 of v.es){
            let i = v.ports.indexOf(Util.Edge.v2(e2, v));
            if(i == -1) continue;
            // console.log("aa " + ps + ", " + i + ", "  + pt+ " -> " + ((ps < pt && i >= ps && i <= pt) || (ps > pt && (i >= ps || i <= pt))) +  " and " +  (e2.occupiedStatus == 1))
            if(((ps <= pt && i >= ps && i <= pt) || (ps > pt && (i >= ps || i <= pt))) && e2.occupiedStatus != 2){
              // console.log("coloring T", ps, i, pt)
              // let ls = Geometry.objTypes.LineSegment.constr(v.p, v.ports[i].p);
              // ls.visual.objectColor = "cyan"
              // v.ports[i].p.visual.objectColor = "cyan"
              let c = 0;
              e2.costKeys = ["cs", {a: v.p, b: e.t.p, l: "t2"}];
              for(let e3 of settledAdj){
                psa = (e.t.id == e3.s.id) ? e3.sPortUsed : e3.tPortUsed;
                if(psa > i && !bendCosts[psa-i] || psa <= i && !bendCosts[i-psa]) console.warn("invalid cost key", psa, i, e3, e)
                if(psa > i && ver.costs[bendCosts[psa-i]] < Number.MAX_SAFE_INTEGER) e2.costKeys.push(bendCosts[psa-i]);
                else if(ver.costs[bendCosts[i-psa]] < Number.MAX_SAFE_INTEGER) e2.costKeys.push(bendCosts[i-psa]);
              }
              // console.log("exit "+ i +" got cost " + c)

              // console.log("using bend " + c)
              // console.log(e2.cost)
              // console.log("updatedT")
              // console.log(e2.cost)

              if(e2.occupiedStatus == 1) e2.occupiedStatus = -1;
              tempOpen.push(e2);
            }else if(e2.occupiedStatus == 1){//TODO does this belong here?
              tempClosed.push(e2);
              e2.occupiedStatus = 3;
            }
          }
        }//else console.warn("t")
      }
      
      // console.log(S[0].id, T[0].id, S.length, T.length)

      // for(let v of S){
      //   // v.p.visual.objectColor = "yellow"
      //   // v.p.visual.objectDimensions = {w:10, h:3}
      //   console.log("S costs")
      //   for(let ed of v.es) console.log(ed.cost);
      // }
      // for(let v of T){
      //   // v.p.visual.objectColor = "green"
      //   // v.p.visual.objectDimensions = {w:3, h:10}
      //   console.log("T costs")
      //   for(let ed of v.es) console.log(ed.cost);
      // }
      if(S.some(v => T.includes(v))) console.error("vtx in both S and T", S, T, e, sCandidate, tCandidate, e.s.settled, e.t.settled, occupiedPS);
      ret = MetroMap.Routing.routeEdgeCleanup(ver, MetroMap.Routing.s2sDijkstra(ver, S, T, grid), e, S, T, sCandidate, tCandidate, tempOpen, tempClosed, objectsShown);
      if(Writing.measurePerformance2) Writing.times.ps[endptsSet][Writing.times.ps[endptsSet].length-1] += performance.now();
      return ret;
    },
    routeEdgeCleanup: (ver, dijkstra, e, S, T, sCandidate, tCandidate, tempOpen, tempClosed, objectsShown) => {
      let grid = Version.current.graphs.gridG;
      // console.log(dijkstra);
      if(!dijkstra[0]){
        //for(let v of S) v.p.visual.objectDimensions = {w: 15, h: 15};
        //for(let v of T) v.p.visual.objectDimensions = {w: 10, h: 10};
        // MetroMap.Routing.s2sDijkstra(S, T, grid, true);
        // console.log(S)
        // console.log(T)
        // console.warn("Wasn't reachable!!! stopping... edge routing");
        return false;
      }
      let path = dijkstra[2];
      let edgePath = dijkstra[3];
      e.settled = true;
      e.sPortUsed = path[0].ports.indexOf(path[1]);
      e.tPortUsed = path[path.length-1].ports.indexOf(path[path.length-2]);
      e.edgePath = edgePath;
      e.path = path;
      e.s.gridNode = path[0];
      if(!e.s.settled || sCandidate){
        e.s.gridNode.p.visual.objectShown = objectsShown;
        e.s.gridNode.p.visual.objectColor = Canvas.Colors.resultVtx;
        // e.s.mgToGridConnectors = Geometry.objTypes.LineSegment.constr(e.s.p, e.s.gridNode.p);
        // e.s.mgToGridConnectors.visual.objectShown = false && objectsShown && document.getElementById("cbShowMG").checked && (objectsShown || document.getElementById("cbShowLineDrawing").checked);
        // e.s.mgToGridConnectors.visual.objectColor = "grey";
      }
      e.s.settled = true;
      path[0].origStation = e.s;
      path[0].settleable = false;
      e.t.gridNode = path[path.length-1];
      if(!e.t.settled || tCandidate){
        e.t.gridNode.p.visual.objectShown = objectsShown;
        e.t.gridNode.p.visual.objectColor = Canvas.Colors.resultVtx;
        // e.t.mgToGridConnectors = Geometry.objTypes.LineSegment.constr(e.t.p, e.t.gridNode.p);
        // e.t.mgToGridConnectors.visual.objectShown =  false && objectsShown && document.getElementById("cbShowMG").checked && (objectsShown || document.getElementById("cbShowLineDrawing").checked);
        // e.t.mgToGridConnectors.visual.objectColor = "grey";
      }
      e.t.settled = true;
      path[path.length-1].origStation = e.t;
      path[path.length-1].settleable = false;
      for(let v of S){
        for(let e2 of v.es) e2.costKeys = ["cs"]; 
      }
      for(let v of T){
        for(let e2 of v.es) e2.costKeys = ["cs"]; 
      }
      for(let e2 of tempOpen){
        e2.occupiedStatus = 1;
      }
      for(let e2 of tempClosed){
        if(e2.occupiedStatus == 3) e2.occupiedStatus = 1;
      }
      for(let e2 of edgePath){
        if(!e2.ls) e2.ls = Geometry.objTypes.LineSegment.constr(ver, e2.s.p, e2.t.p);
        // e2.ls.e = e2;
        e2.ls.visual.objectColor = Canvas.Colors.resultEdge;
        e2.ls.visual.objectDimensions = 3;
        e2.ls.visual.objectShown = objectsShown;
        e2.occupiedStatus = 2;
        e2.occupiedStatusDict[e.id] = 2;
        e2.origEdge = e;
        e2.blockedDiagonals = [];
        let i, j, pNr;
        if(e2.s.ports){
          continue;
        }else{
          i = e2.s.parent.gridCoords.i;
          j = e2.s.parent.gridCoords.j;
          pNr = e2.s.parent.ports.indexOf(e2.s);
        }
        if(pNr == -1) continue;
        if(pNr == 1){
          for(let e3 of grid.gridNodes[i][j-1].ports[3].es){
            if(Util.Edge.v2(e3, grid.gridNodes[i][j-1].ports[3]) == grid.gridNodes[i+1][j].ports[7]){
              e3.occupiedStatus = 2;
              e3.occupiedStatusDict[e.id] = 2;
              e2.blockedDiagonals.push(e3);
            }
          }
        }else if(pNr == 3){
          for(let e3 of grid.gridNodes[i][j+1].ports[1].es){
            if(Util.Edge.v2(e3, grid.gridNodes[i][j+1].ports[1]) == grid.gridNodes[i+1][j].ports[5]){
              e3.occupiedStatus = 2;
              e3.occupiedStatusDict[e.id] = 2;
              e2.blockedDiagonals.push(e3);
            }
          }
        }else if(pNr == 5){
          for(let e3 of grid.gridNodes[i][j+1].ports[7].es){
            if(Util.Edge.v2(e3, grid.gridNodes[i][j+1].ports[7]) == grid.gridNodes[i-1][j].ports[3]){
              e3.occupiedStatus = 2;
              e3.occupiedStatusDict[e.id] = 2;
              e2.blockedDiagonals.push(e3);
            }
          }
        }else if(pNr == 7){
          for(let e3 of grid.gridNodes[i][j-1].ports[5].es){
            if(Util.Edge.v2(e3, grid.gridNodes[i][j-1].ports[5]) == grid.gridNodes[i-1][j].ports[1]){
              e3.occupiedStatus = 2;
              e3.occupiedStatusDict[e.id] = 2;
              e2.blockedDiagonals.push(e3);
            }
          }
        }
      }
      for(let e2 of path[0].es){
        if(e2.occupiedStatus != 2) e2.occupiedStatus = 1;
        e2.occupiedStatusDict[e.id] = 1;
      }
      for(let p of path[0].ports){
        for(let e2 of p.es){
          if(Util.Edge.v2(e2, p).parent && Util.Edge.v2(e2, p).parent.id == path[0].id){
            e2.occupiedStatus = 2;
            e2.occupiedStatusDict[e.id] = 2;
          }
        }
      }
      for(let i = 2; i < path.length-2; i += 2){
        let v = path[i];
        if(!v.ports){
          v = v.parent;
          v.settleable = false;
          for(let p of v.ports){
            for(let e2 of p.es) if(!Util.Edge.v2(e2, p).parent || Util.Edge.v2(e2, p).parent.id == v.id){
              e2.occupiedStatus = 2;
              e2.occupiedStatusDict[e.id] = 2;
            }
          }
        }
      }
      for(let e2 of path[path.length-1].es){
        if(e2.occupiedStatus != 2) e2.occupiedStatus = 1;
        e2.occupiedStatusDict[e.id] = 1;
      }
      for(let p of path[path.length-1].ports){
        for(let e2 of p.es){
          if(Util.Edge.v2(e2, p).parent && Util.Edge.v2(e2, p).parent.id == path[path.length-1].id){
            e2.occupiedStatus = 2;
            e2.occupiedStatusDict[e.id] = 2;
          }
        }
      }
      dijkstra.push(e);
      return dijkstra;
    },
    routeVertices: (ver, vArr) => {
      let es = [];
      let tempPS = [];
      for(let v of vArr){
        MetroMap.Routing.unsettleVtx(v);
        for(let e of v.es){
          if(!es.includes(e)){
            es.push(e);
            e.skipUnsettle = true;
          }
        }
      }
      for(let v of vArr){
        for(let e of v.es) e.skipUnsettle = undefined;
      }
      let success = MetroMap.Routing.routeEdges(ver, es);
      return success;
    },
    routeEdges: (ver, eArr) => {
      let newDijkstras = [];
      let gids = {};
      for(let e of eArr) if(ver.routeSettings.frozenEdges[e.id] && !gids[ver.routeSettings.frozenEdges[e.id].groupID]) gids[ver.routeSettings.frozenEdges[e.id].groupID] = true;
      // console.log(eArr.length, gids);
      for(let fe in ver.routeSettings.frozenEdges) if(gids[ver.routeSettings.frozenEdges[fe].groupID] && !eArr.includes(ver.graphs.cG.edges[fe])) eArr.push(ver.graphs.cG.edges[fe]);
      // console.log(eArr.length);
      let eO = MetroMap.Routing.recalcEdgeOrder(ver);
      eArr.sort((a, b) => eO[b.id] - eO[a.id]);
      let success = true;
      for(let e of eArr){
        if(!success) break;
        if(Writing.measurePerformance3) Writing.times.estim = MetroMap.Routing.estimateRouteEdgesDistance(Version.current, [e], []);
        // console.log(ver.routeSettings.positionedStations[e.s.contractParent.id], ver.routeSettings.positionedStations[e.t.contractParent.id])
        if(ver.routeSettings.straightEdges.some(se => se.length == e.chain.length && se.every(e2 => e.chain.includes(e2)))){
          let oldCosts = {};
          for(let ck of ["c135", "c90", "c45", "candidateRadius"]){
            oldCosts[ck] = Version.current.costs[ck];
            Version.current.costs[ck] = Number.MAX_SAFE_INTEGER;
          }
          Version.current.costs["candidateRadius"] = oldCosts["candidateRadius"]*2;
          if(Writing.measurePerformance2) Writing.times.se.push(-1*performance.now());
          newDijkstras.push(MetroMap.Routing.routeEdge(ver, e, ver.routeSettings.positionedStations[e.s.contractParent.id], ver.routeSettings.positionedStations[e.t.contractParent.id], ver.routeSettings.frozenEdges[e.id]));
          if(Writing.measurePerformance2) Writing.times.se[Writing.times.se.length-1] += performance.now();
          for(let ck of ["c135", "c90", "c45", "candidateRadius"]) Version.current.costs[ck] = oldCosts[ck];
        }else{
          if(Writing.measurePerformance2) Writing.times.nse.push(-1*performance.now());
          newDijkstras.push(MetroMap.Routing.routeEdge(ver, e, ver.routeSettings.positionedStations[e.s.contractParent.id], ver.routeSettings.positionedStations[e.t.contractParent.id], ver.routeSettings.frozenEdges[e.id]));
          if(Writing.measurePerformance2) Writing.times.nse[Writing.times.nse.length-1] += performance.now();
        }
        if(!newDijkstras[newDijkstras.length-1]) success = false;
        if(success && Writing.measurePerformance3) Writing.times.es[Writing.times.es.length-1] = [(newDijkstras[newDijkstras.length-1][3].length-1)/2, Geometry.distanceBetween(newDijkstras[newDijkstras.length-1][4].s.p, newDijkstras[newDijkstras.length-1][4].t.p), Writing.times.estim, Writing.times.es[Writing.times.es.length-1]];
      }
      if(Writing.measurePerformance) Writing.times.e = performance.now(); 
      if(success) MetroMap.Post.updateDijkstras(ver, newDijkstras);
      else{
        if(!Writing.suppressDialogue && confirm("Routing failed - Do you want to undo the last change? (otherwise stuff may break...)"))
          Version.load(Version.current.versionIndex-1); //TODO this isnt necessarily the previous  state i think and mb delete a verssion from the list
      }
      return success;
    },
    routeEdgeSearch: (ver, v, gn, firstOnly) => {
      let del = true;
      if(ver.routeSettings.positionedStations[v.contractParent.id]) del = false;
      ver.routeSettings.positionedStations[v.contractParent.id] = gn;
      let newDijkstras = [];
      let eO = MetroMap.Routing.recalcEdgeOrder(ver);
      let eArr = v.es;
      eArr.sort((a, b) => eO[b.id] - eO[a.id]);
      let success = true;
      for(let e of eArr){
        if(!success) break;
        if(ver.routeSettings.straightEdges.some(se => se.length == e.chain.length && se.every(e2 => e.chain.includes(e2)))){
          let oldCosts = {};
          for(let ck of ["c135", "c90", "c45", "candidateRadius"]){
            oldCosts[ck] = Version.current.costs[ck];
            Version.current.costs[ck] = Number.MAX_SAFE_INTEGER;
          }
          Version.current.costs["candidateRadius"] = oldCosts["candidateRadius"]*2;
          // newDijkstras.push(MetroMap.Routing.routeEdge(ver, e, firstOnly && e.s.id == v.id ? gn : false, firstOnly && e.t.id == v.id ? gn : false));
          newDijkstras.push(MetroMap.Routing.routeEdge(ver, e, ver.routeSettings.positionedStations[e.s.contractParent.id], ver.routeSettings.positionedStations[e.t.contractParent.id], ver.routeSettings.frozenEdges[e.id]));

          for(let ck of ["c135", "c90", "c45", "candidateRadius"]) Version.current.costs[ck] = oldCosts[ck];
        }else{
          // newDijkstras.push(MetroMap.Routing.routeEdge(ver, e, firstOnly && e.s.id == v.id ? gn : false, firstOnly && e.t.id == v.id ? gn : false));
          newDijkstras.push(MetroMap.Routing.routeEdge(ver, e, ver.routeSettings.positionedStations[e.s.contractParent.id], ver.routeSettings.positionedStations[e.t.contractParent.id], ver.routeSettings.frozenEdges[e.id]));

        }
        if(!newDijkstras[newDijkstras.length-1]) success = false;
        firstOnly = false;
      }
      if(success) MetroMap.Post.updateDijkstras(ver, newDijkstras);
      if(del) delete ver.routeSettings.positionedStations[v.contractParent.id];
      return success;
    },
    estimateRouteVerticesDistance: (ver, vArr, settings = {}) => {
      let es = [];
      for(let v of vArr) for(let e of v.es) if(!es.includes(e)) es.push(e);
      return MetroMap.Routing.estimateRouteEdgesDistance(ver, es, vArr, settings);
    },
    estimateRouteEdgesDistance: (ver, eArr, vArr, settings = {}) => {
      let d = 0;
      for(let e of eArr){
        let sp = e.s.p;
        let tp = e.t.p;
        if(settings.positionedStations && settings.positionedStations[e.s.id]) sp = settings.positionedStations[e.s.id].p;
        else if(ver.routeSettings.positionedStations[e.s.contractParent.id]) sp = ver.routeSettings.positionedStations[e.s.contractParent.id].p;
        else if(e.s.settled && !vArr.includes(e.s)) sp = e.s.gridNode.p;
        if(settings.positionedStations && settings.positionedStations[e.t.id]) tp = settings.positionedStations[e.t.id].p;
        else if(ver.routeSettings.positionedStations[e.t.contractParent.id]) tp = ver.routeSettings.positionedStations[e.t.contractParent.id].p;
        else if(e.t.settled && !vArr.includes(e.t)) tp = e.t.gridNode.p;
        d += Geometry.distanceBetween(sp, tp)/Version.current.graphs.gridG.D;
      }
      // console.log(Math.round(d))
      return d;
    },
    findClosestGridNode: (ver, v) => {
      let grid = Version.current.graphs.gridG;
      let minD = Number.MAX_SAFE_INTEGER;
      let minV;
      for(let i = 0; i < grid.gridNodes.length; i++){
        for(let j = 0; j < grid.gridNodes[0].length; j++){
          let u = grid.gridNodes[i][j];
          if(u.settleable && Geometry.distanceBetween(v.p, u.p) < minD){
            minD = Geometry.distanceBetween(v.p, u.p);
            minV = u;
          }
        }
      }
      return minV;
    },
    aStarHeuristic: (ver, s, Tsides) => {
      let gn = s.ports ? s : s.parent;
      if(!gn) return MetroMap.Routing.aStarHeuristic(ver, Util.Edge.v2(s.es[0], s), Tsides); //s2sV
      let xDiff, yDiff, cost;
      if(gn.gridCoords.i >= Tsides.l && gn.gridCoords.i <= Tsides.r) xDiff = 0;
      else if(gn.gridCoords.i < Tsides.l) xDiff = Tsides.l - gn.gridCoords.i;
      else xDiff = gn.gridCoords.i - Tsides.r;
      if(gn.gridCoords.j >= Tsides.t && gn.gridCoords.j <= Tsides.b) yDiff = 0;
      else if(gn.gridCoords.j < Tsides.t) yDiff = Tsides.t - gn.gridCoords.j;
      else yDiff = gn.gridCoords.j - Tsides.b;
      let diagPart = Math.min(xDiff, yDiff);
      let aaPart = Math.max(xDiff, yDiff) - diagPart;
      cost = ver.costs["ch"] * (diagPart+aaPart) + ver.costs["c180"] * Math.max(0, diagPart+aaPart-1);
      if(diagPart != 0 && aaPart != 0) cost += ver.costs["c135"];
      return cost;
    },
    s2sDijkstra: (ver, S, T, g, colorVisited = false) => {
      if(Writing.measurePerformance3) Writing.times.es.push(-1*performance.now());
      // console.warn(S[0].id, T[0].id, S.length, T.length)
      // if(S[0].id == 1350 && T[0].id == 1620) colorVisited = true;
      // if(S[0].id == 1350 && T[0].id == 1620){
      //   for(let t of S) for(let e of t.es) console.log(e.cost)
      //   console.log("................")
      //   for(let t of T) for(let e of t.es) console.log(e.cost)
      // }
      let useAStar = false;
      let excessStepsAStar = 0;
      let s2sV = Util.Graph.addVertex(g);
      s2sV.p = Geometry.objTypes.Point.constr(ver, 0, 0);
      let sortTime = 0;
      let inLoopTime = 0;
      let startTime = Date.now();
      let unvisited = [[s2sV], []];; //outer sorted by d, inner by id
      let Tsides = {t: Number.MAX_SAFE_INTEGER, h: 0, r: Number.MIN_SAFE_INTEGER, b: Number.MIN_SAFE_INTEGER, l: Number.MAX_SAFE_INTEGER}; //top, right, bottom, left
      let tCount = 0;
      let minDistanceInT = Number.MAX_SAFE_INTEGER;
      if(useAStar){
        for(let t of T){
          Tsides.t = Math.min(t.gridCoords.j, Tsides.t);
          Tsides.r = Math.max(t.gridCoords.i, Tsides.r);
          Tsides.b = Math.max(t.gridCoords.j, Tsides.b);
          Tsides.l = Math.min(t.gridCoords.i, Tsides.l);
        }
      }
      if(!g.s2sDijkstraIDSortedVtcs){
        g.s2sDijkstraIDSortedVtcs = [];
        for(let v in g.vertices){
          v = g.vertices[v];
          v.dijkstra = {d: Number.MAX_SAFE_INTEGER, h: 0, p: undefined, pe: undefined, visited: false, inT: false};
          if(v != s2sV){
            let i = Util.binarySearch(v, unvisited[1], (a, b) => a.id-b.id, 0, unvisited[1].length)[1];
            unvisited[1].splice(i, 0, v);
            g.s2sDijkstraIDSortedVtcs.splice(i, 0, v);
          }
        }
        if(useAStar) s2sV.dijkstra.h = S.reduce((acc, s) => Math.min(acc, MetroMap.Routing.aStarHeuristic(ver, s, Tsides)), Number.MAX_SAFE_INTEGER);
        s2sV.dijkstra.d = s2sV.dijkstra.h;
      }else{
        for(let v of g.s2sDijkstraIDSortedVtcs){
          v.dijkstra = {d: Number.MAX_SAFE_INTEGER, h: 0, p: undefined, pe: undefined, visited: false, inT: false};
          unvisited[1].push(v);
        }
        s2sV.dijkstra = {d: 0, h: useAStar ? S.reduce((acc, s) => Math.min(acc, MetroMap.Routing.aStarHeuristic(ver, s, Tsides)), Number.MAX_SAFE_INTEGER) : 0, p: undefined, pe: undefined, visited: false, inT: false};
        if(useAStar) s2sV.dijkstra.d = s2sV.dijkstra.h;
      }
      for(let v of S){
        let e2 = Util.Graph.addEdge(g, s2sV.id, v.id);
        e2.costKeys = ["min"];
      }
      for(let v of T){
        v.dijkstra.inT = true;
      }
      let initTime = Date.now()-startTime;
      while(unvisited.length > 0){
        let loopStart = Date.now();
        let u = unvisited[0].length == 1 ? unvisited.shift()[0] : unvisited[0].shift();
        if(u.dijkstra.d >= Number.MAX_SAFE_INTEGER){
          // console.log("cheapest next nodes has inf cost, cancelling")
          //for(let i = 0; i < Math.min(6000, unvisited.length);i++)if(unvisited[i].dijkstra.d < Number.MAX_SAFE_INTEGER) console.log("cheaper not 1st:" + i +" = " + unvisited[i].dijkstra.d);
          break;
        }
        u.dijkstra.visited = true;
        if(colorVisited){
          u.p.visual.objectColor = "black"
        }
        // if(useAStar && minDistanceInT < u.dijkstra.d - u.dijkstra.h) break;
        if(useAStar && tCount >= T.length){
          excessStepsAStar--;
          if(excessStepsAStar <= 0) break;
        }
        if(u.dijkstra.inT){
          if(!useAStar) break;
          // minDistanceInT = Math.min(minDistanceInT, u.dijkstra.d - u.dijkstra.h);
          tCount++;
          u.dijkstra.inT = false;
          //if(tCount == T.length) break;

          // console.log("finsished!!");
          //console.log(T)
          
        }
        if(u.ports && !T.includes(u) && !u.dijkstra.pe.costKeys.includes("min")) {
          // console.log("stopped from going to sink", u.dijkstra.d,u,u.dijkstra.pe.costKeys);u.p.visual.objectShown=true; 
          continue;}
        inLoopTime += (Date.now()-loopStart);
        for(let e of u.es){
          loopStart = Date.now();
          if(colorVisited){
            if(!e.ls) e.ls = Geometry.objTypes.LineSegment.constr(ver, e.s.p, e.t.p);
            e.ls.visual.objectColor = "black"
          }
          let v = Util.Edge.v2(e, u);
          inLoopTime += (Date.now()-loopStart);
          if((!v.dijkstra.visited || useAStar) && Util.Edge.calcCost(e) < Number.MAX_SAFE_INTEGER && e.occupiedStatus <= 0){
            let d = Util.Edge.calcCost(e) + u.dijkstra.d;
            if(useAStar){
              if(v.dijkstra.h == 0) v.dijkstra.h = MetroMap.Routing.aStarHeuristic(ver, v, Tsides);
              d += v.dijkstra.h - u.dijkstra.h;
            }
            //let d = 1 + u.dijkstra.d;
            if(ver.routeSettings.disallowBends){
              let gc = v.parent ? v.parent.gridCoords : v.gridCoords;
              let gc2 = S[0].gridCoords;

              if(gc && gc.i != gc2.i && gc.j != gc2.j && gc.i+gc.j != gc2.i+gc2.j && gc.j-gc.i != gc2.j-gc2.i) d = Number.MAX_SAFE_INTEGER;
            }
            if(d < v.dijkstra.d){
              let sortStart = Date.now();
              let i;
              if(!v.dijkstra.visited){
                i = Util.binarySearch([v], unvisited, (a, b) => a[0].dijkstra.d-b[0].dijkstra.d, 0, unvisited.length);
                // let splicedV;
                // if(!i[0]){console.log("+++++++++++++++++++++");for(let un of unvisited)console.log(un[0].dijkstra.d + "  -  " + un.length);console.log(i);unv=unvisited;return;}
                // i=i[1]
                // if(unvisited[i][unvisited[i].length-1].dijkstra.d != v.dijkstra.d) console.warn("what a mess");
                // if(unvisited[i].length == 1){ console.log("remm" + i);splicedV=unvisited.splice(i, 1)}
                // else{ console.log("////////" + unvisited[i][0].dijkstra.d + " - " + unvisited[i].length);splicedV= unvisited[i].splice(binarySearch(v, unvisited[i], (a, b) => a.id-b.id, 0, unvisited[i].length)[1], 1)};
                // if(!unvCheck(unvisited)) {console.warn("AFTER REMOVE"); return}
                // if(v.id != splicedV[0].id){ console.log(unvisited[i]); console.warn("NON MATCHIN IDS" + binarySearch(v, unvisited[i], (a, b) => a.id-b.id, 0, unvisited[i].length) + " d=" + v.dijkstra.d + " ,id="+v.id)}
                if(!i[0]){console.log("+++++++++++++++++++++");for(let un of unvisited)console.log(un[0].dijkstra.d + "  -  " + un.length);console.log(i);unv=unvisited;return;}
                let splicedV;
                i=i[1]
                if(unvisited[i][unvisited[i].length-1].dijkstra.d != v.dijkstra.d) console.log("what a mess");
                if(unvisited[i].length == 1) splicedV = unvisited.splice(i, 1);
                else splicedV=unvisited[i].splice(Util.binarySearch(v, unvisited[i], (a, b) => a.id-b.id, 0, unvisited[i].length)[1], 1);
                // if(!unvCheck(unvisited)) {console.log("AFTER REMOVE"); return}
                //if(v.dijkstra.d != unvisited[i[1]].dijkstra.d){
                  // console.log("pffffffffffffffffff" + i + " (" + unvisited.indexOf(v)+") ... " + v.dijkstra.d  +  " - " +  unvisited[i[1]-1].dijkstra.d+  ", " +  unvisited[i[1]].dijkstra.d)
                  // binarySearch(v, unvisited, (a, b) => a.dijkstra.d-b.dijkstra.d, 0, unvisited.length, true);
                  // unv = unvisited;
                  // return [false, false];
                  //}  
                // i = i[1];´
                if(i > unvisited.length) i--;
              }
              v.dijkstra.d = d;
              v.dijkstra.p = u;
              v.dijkstra.pe = e;
              // console.log(d + " at "  + i);
              // unvisited.splice(i, 1);
              // while(i > 0 && unvisited[i].dijkstra.d > d) i--;
              // unvisited.splice(i, 0, v);
              // let ind = binarySearch([v], unvisited, (a, b) => a[0].dijkstra.d-b[0].dijkstra.d, 0, i);
              // if(ind[0]) {console.log("***********");console.log(v.id); console.log(binarySearch(v, unvisited[ind[1]], (a, b) => a.id-b.id, 0, unvisited[ind[1]].length));unvisited[ind[1]].splice(binarySearch(v, unvisited[ind[1]], (a, b) => a.id-b.id, 0, unvisited[ind[1]].length)[1], 0, v);for(let un of unvisited[ind[1]])console.log(un.dijkstra.d + " id=" + un.id);}
              // else{unvisited.splice(ind[1], 0, [v]);console.log("---------------");for(let un of unvisited)console.log(un[0].dijkstra.d + "  -  " + un.length);}
              // if(!unvCheck(unvisited)) {console.warn("AFTER INSERT"); unv = unvisited;return}
              let ind = Util.binarySearch([v], unvisited, (a, b) => a[0].dijkstra.d-b[0].dijkstra.d, 0, v.dijkstra.visited ? unvisited.length : i);
              if(ind[0]) {unvisited[ind[1]].splice(Util.binarySearch(v, unvisited[ind[1]], (a, b) => a.id-b.id, 0, unvisited[ind[1]].length)[1], 0, v);}
              else{unvisited.splice(ind[1], 0, [v]);}
              // if(!unvCheck(unvisited)) {console.log("AFTER INSERT"); unv = unvisited;return}
              // if(ind > 0 && unvisited[ind-1].dijkstra.d>unvisited[ind].dijkstra.d) console.log("ALARM" +ind + " : " +unvisited[ind-1].dijkstra.d + ", " + v.dijkstra.d  + ", " + unvisited[ind+1].dijkstra.d )
              // if(ind < unvisited.length-1 && unvisited[ind+1].dijkstra.d<unvisited[ind].dijkstra.d) console.log("2ALARM" +ind + " : " +unvisited[ind-1].dijkstra.d + ", " + v.dijkstra.d  + ", " + unvisited[ind+1].dijkstra.d )
              sortTime += (Date.now()-sortStart);
            }
          }
        }
      }
      let cleanupS = Date.now();
      let minD = Number.MAX_SAFE_INTEGER;
      let minV = T[0];
      for(let t of T){
        if(t.dijkstra.d - t.dijkstra.h < minD){
          minD = t.dijkstra.d - t.dijkstra.h;
          minV = t;
        }
      }
      let cost = minV.dijkstra.d - minV.dijkstra.h - Util.Edge.calcCost(s2sV.es[0]);
      let path = [minV];
      let edgePath = [];
      let v = minV;
      while(v.dijkstra.p && v.dijkstra.p != s2sV){
        path.unshift(v.dijkstra.p);
        edgePath.unshift(v.dijkstra.pe);
        v = v.dijkstra.p;
      }
      let reachable = true;
      if(!v.dijkstra.p) reachable = false;
      if(reachable && path.length == 1){
        for(let v of S){
          v.p.visual.objectShown = true;
          v.p.visual.objectColor = "lime";
        }
        for(let v of T){
          v.p.visual.objectShown = true;
          v.p.visual.objectColor = "pink";
        }
        minV.p.visual.highlightShown = true
        Canvas.redraw();
        console.error("short path...", path, v, minV, minV.dijkstra.d, v.dijkstra.p, S.indexOf(minV), T.indexOf(minV));
      }
      Util.Graph.removeVertex(g, s2sV);
      if(Writing.measurePerformance3) Writing.times.es[Writing.times.es.length-1] += performance.now();
      // console.log("s2sd took a total of " + (Date.now()-startTime) + "ms of which sorting: " + sortTime + "ms, init: " + initTime + "ms, cleanup: " + (Date.now()-cleanupS) + "ms , inLoop: " + inLoopTime + "ms")
      return [reachable, cost, path, edgePath];
    }
  },
  GraphCreation: {
    deg2Contract: (ver, g, objectsShown = ver.checkBoxes.cbShowCG) => {
      let g2 = Util.Graph.constr(ver, "cG");
      let v;
      let unvisited = [];
      for(let v2 in g.vertices){
        v2 = g.vertices[v2];
        v2.contract = {visited: false};
        if(ver.routeSettings.contractAllowed[v2.id] > 1){
          if(unvisited.length == 0) unvisited.push(v2);
          let v3 = Util.Graph.addVertex(g2);
          v3.p = Geometry.objTypes.Point.constr(ver, v2.p.x, v2.p.y);
          v3.p.visual.objectColor = "green";
          v3.p.visual.objectShown = objectsShown;
          v2.contract.v = v3;
          v3.contractParent = v2;
        }
      }
      for(let e in g.edges){
        g.edges[e].contract = {visited: false};
      }
      while(unvisited.length > 0){ 
        v = unvisited.pop();
        v.contract.visited = true;
        for(let e of v.es){
          let u = Util.Edge.v2(e, v);
          if(e.contract.visited) continue;
          //if(u.contract.visited) continue;
          let chain = [e];
          e.contract.visited = true;
          let lines = e.lines;
          while(!u.contract.v){
            e = u.es[0].id == e.id ? u.es[1] : u.es[0];
            if(e.lines.length != lines.length || !e.lines.every(l => lines.includes(l))) break;
            chain.push(e);
            u.contract.visited = true;
            e.contract.visited = true;
            u = Util.Edge.v2(e, u);
          }
          if(u.id == v.id){
            if(chain.length < 3) console.warn("short chain at self edge");
            else{
              let m = Math.floor(chain.length/3);
              let m2 = Math.floor(2*chain.length/3);
              let v2;
              if(chain[m].s.id == chain[m-1].t.id) v2 = chain[m].s;
              else if(chain[m].s.id == chain[m-1].s.id) v2 = chain[m].s;
              else if(chain[m].t.id == chain[m-1].s.id) v2 = chain[m].t;
              else if(chain[m].t.id == chain[m-1].t.id) v2 = chain[m].t;
              let v3 = Util.Graph.addVertex(g2);
              v3.p = Geometry.objTypes.Point.constr(ver, v2.p.x, v2.p.y);
              v3.p.visual.objectColor = "green";
              v3.p.visual.objectShown = objectsShown;
              v2.contract.v = v3;
              v3.contractParent = v2;
              let e2 = Util.Graph.addEdge(g2, v.contract.v.id, v3.id);
              e2.chain = chain.slice(0, m);
              e2.lines = lines;
              e2.ls = Geometry.objTypes.LineSegment.constr(ver, e2.s.p, e2.t.p);
              e2.ls.visual.objectColor = "green";
              e2.ls.visual.objectShown = objectsShown;
              if(chain[m2].s.id == chain[m2-1].t.id) v2 = chain[m2].s;
              else if(chain[m2].s.id == chain[m2-1].s.id) v2 = chain[m2].s;
              else if(chain[m2].t.id == chain[m2-1].s.id) v2 = chain[m2].t;
              else if(chain[m2].t.id == chain[m2-1].t.id) v2 = chain[m2].t;
              let v4 = Util.Graph.addVertex(g2);
              v4.p = Geometry.objTypes.Point.constr(ver, v2.p.x, v2.p.y);
              v4.p.visual.objectColor = "green";
              v4.p.visual.objectShown = objectsShown;
              v2.contract.v = v4;
              v4.contractParent = v2;
              e2 = Util.Graph.addEdge(g2, v3.id, v4.id);
              e2.chain = chain.slice(m, m2);
              e2.lines = lines;
              e2.ls = Geometry.objTypes.LineSegment.constr(ver, e2.s.p, e2.t.p);
              e2.ls.visual.objectColor = "green";
              e2.ls.visual.objectShown = objectsShown;
              e2 = Util.Graph.addEdge(g2, v4.id, u.contract.v.id);
              e2.chain = chain.slice(m2);
              e2.lines = lines;
              e2.ls = Geometry.objTypes.LineSegment.constr(ver, e2.s.p, e2.t.p);
              e2.ls.visual.objectColor = "green";
              e2.ls.visual.objectShown = objectsShown;
              if(!u.contract.visited){
                unvisited.push(u);
              }
            }
          }else if(u.contract.v.es.some(e => Util.Edge.v2(e, u.contract.v).id == v.contract.v.id)){
            if(chain.length < 2) console.warn("short chain at multiedge");
            else{
              let m = Math.floor(chain.length/2);
              let v2;
              if(chain[m].s.id == chain[m-1].t.id) v2 = chain[m].s;
              else if(chain[m].s.id == chain[m-1].s.id) v2 = chain[m].s;
              else if(chain[m].t.id == chain[m-1].s.id) v2 = chain[m].t;
              else if(chain[m].t.id == chain[m-1].t.id) v2 = chain[m].t;
              let v3 = Util.Graph.addVertex(g2);
              v3.p = Geometry.objTypes.Point.constr(ver, v2.p.x, v2.p.y);
              v3.p.visual.objectColor = "green";
              v3.p.visual.objectShown = objectsShown;
              v2.contract.v = v3;
              v3.contractParent = v2;
              let e2 = Util.Graph.addEdge(g2, v.contract.v.id, v3.id);
              e2.chain = chain.slice(0, m);
              e2.lines = lines;
              e2.ls = Geometry.objTypes.LineSegment.constr(ver, e2.s.p, e2.t.p);
              e2.ls.visual.objectColor = "green";
              e2.ls.visual.objectShown = objectsShown;
              console.log(v)
              console.log(e2.chain)
              console.log(v2)
              
              e2 = Util.Graph.addEdge(g2, v3.id, u.contract.v.id);
              e2.chain = chain.slice(m);
              e2.lines = lines;
              e2.ls = Geometry.objTypes.LineSegment.constr(ver, e2.s.p, e2.t.p);
              e2.ls.visual.objectColor = "green";
              e2.ls.visual.objectShown = objectsShown;
              console.log(e2.chain)
              console.log(u)
              if(!u.contract.visited){
                unvisited.push(u);
              }
            }
          }else{
            let e2 = Util.Graph.addEdge(g2, v.contract.v.id, u.contract.v.id);
            e2.chain = chain;
            e2.lines = lines;
            e2.ls = Geometry.objTypes.LineSegment.constr(ver, e2.s.p, e2.t.p);
            e2.ls.visual.objectColor = "green";
            e2.ls.visual.objectShown = objectsShown;
            if(!u.contract.visited){
              unvisited.push(u);
            }
          }
        }
      }
      return g2;
    }
  }
};

