/**
 * RoboPath style discipline: Kinetic Cartography — the simulation field is primary;
 * controls read as compact engineering instruments on a warm cartographic workspace.
 */
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Compass,
  Crosshair,
  Eraser,
  MapPin,
  Pause,
  Play,
  Plus,
  Radar,
  RotateCcw,
  ScanLine,
  Target,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Algorithm = "BFS" | "Dijkstra" | "A*" | "D* Lite" | "RRT" | "RRT*";
type ToolMode = "obstacle" | "robot" | "eraser";

type GridPoint = { x: number; y: number };
type RouteResult = {
  path: GridPoint[];
  explored: GridPoint[];
  cost: number;
  duration: number;
  message: string;
};

type EventState = {
  label: string;
  detail: string;
  tone: "calm" | "alert" | "success";
};

const GRID_WIDTH = 12;
const GRID_HEIGHT = 10;
const initialStart = { x: 1, y: 8 };
const initialGoal = { x: 10, y: 1 };
const INITIAL_BLOCKS = [
  "3,2",
  "4,2",
  "5,2",
  "7,2",
  "8,2",
  "3,3",
  "5,3",
  "8,3",
  "3,4",
  "5,4",
  "6,4",
  "8,4",
  "3,5",
  "5,5",
  "8,5",
  "3,6",
  "4,6",
  "5,6",
  "8,6",
  "8,7",
  "9,7",
];

const algorithmDescriptions: Record<Algorithm, string> = {
  BFS: "uniform frontier sweep",
  Dijkstra: "cost-complete search",
  "A*": "heuristic route search",
  "D* Lite": "incremental repair loop",
  RRT: "randomized exploration tree",
  "RRT*": "tree optimization search",
};

const pointKey = (point: GridPoint) => `${point.x},${point.y}`;
const samePoint = (a: GridPoint, b: GridPoint) => a.x === b.x && a.y === b.y;
const manhattan = (a: GridPoint, b: GridPoint) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function inBounds(point: GridPoint) {
  return point.x >= 0 && point.y >= 0 && point.x < GRID_WIDTH && point.y < GRID_HEIGHT;
}

function neighbors(point: GridPoint, blocked: Set<string>) {
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ].filter((candidate) => inBounds(candidate) && !blocked.has(pointKey(candidate)));
}

function tracePath(cameFrom: Map<string, GridPoint>, start: GridPoint, goal: GridPoint) {
  const result = [goal];
  let current = goal;
  while (!samePoint(current, start)) {
    const previous = cameFrom.get(pointKey(current));
    if (!previous) return [];
    result.push(previous);
    current = previous;
  }
  return result.reverse();
}

function breadthFirst(start: GridPoint, goal: GridPoint, blocked: Set<string>): RouteResult {
  const clock = performance.now();
  const queue = [start];
  const visited = new Set([pointKey(start)]);
  const cameFrom = new Map<string, GridPoint>();
  const explored: GridPoint[] = [];

  while (queue.length) {
    const current = queue.shift()!;
    explored.push(current);
    if (samePoint(current, goal)) {
      const path = tracePath(cameFrom, start, goal);
      return { path, explored, cost: Math.max(0, path.length - 1), duration: performance.now() - clock, message: "route resolved" };
    }
    for (const next of neighbors(current, blocked)) {
      const key = pointKey(next);
      if (!visited.has(key)) {
        visited.add(key);
        cameFrom.set(key, current);
        queue.push(next);
      }
    }
  }
  return { path: [], explored, cost: 0, duration: performance.now() - clock, message: "no traversable route" };
}

function weightedSearch(start: GridPoint, goal: GridPoint, blocked: Set<string>, heuristicWeight = 0): RouteResult {
  const clock = performance.now();
  const frontier: Array<{ point: GridPoint; priority: number }> = [{ point: start, priority: 0 }];
  const distance = new Map<string, number>([[pointKey(start), 0]]);
  const cameFrom = new Map<string, GridPoint>();
  const explored: GridPoint[] = [];

  while (frontier.length) {
    frontier.sort((a, b) => a.priority - b.priority);
    const current = frontier.shift()!.point;
    explored.push(current);
    if (samePoint(current, goal)) {
      const path = tracePath(cameFrom, start, goal);
      return { path, explored, cost: Math.max(0, path.length - 1), duration: performance.now() - clock, message: "route resolved" };
    }
    const currentDistance = distance.get(pointKey(current)) ?? Infinity;
    for (const next of neighbors(current, blocked)) {
      const nextDistance = currentDistance + 1;
      if (nextDistance < (distance.get(pointKey(next)) ?? Infinity)) {
        distance.set(pointKey(next), nextDistance);
        cameFrom.set(pointKey(next), current);
        frontier.push({ point: next, priority: nextDistance + manhattan(next, goal) * heuristicWeight });
      }
    }
  }
  return { path: [], explored, cost: 0, duration: performance.now() - clock, message: "no traversable route" };
}

function randomTree(start: GridPoint, goal: GridPoint, blocked: Set<string>, optimize = false): RouteResult {
  const clock = performance.now();
  const nodes = [start];
  const parents = new Map<string, GridPoint>();
  const nodeCost = new Map<string, number>([[pointKey(start), 0]]);
  const seen = new Set([pointKey(start)]);

  for (let iteration = 0; iteration < 520; iteration += 1) {
    const sample = iteration % 7 === 0 ? goal : { x: Math.floor(Math.random() * GRID_WIDTH), y: Math.floor(Math.random() * GRID_HEIGHT) };
    const nearest = nodes.reduce((best, candidate) => (manhattan(candidate, sample) < manhattan(best, sample) ? candidate : best));
    const dx = sample.x - nearest.x;
    const dy = sample.y - nearest.y;
    const primary = Math.abs(dx) >= Math.abs(dy) ? { x: nearest.x + Math.sign(dx), y: nearest.y } : { x: nearest.x, y: nearest.y + Math.sign(dy) };
    const secondary = Math.abs(dx) >= Math.abs(dy) ? { x: nearest.x, y: nearest.y + Math.sign(dy) } : { x: nearest.x + Math.sign(dx), y: nearest.y };
    const candidate = [primary, secondary, ...neighbors(nearest, blocked)].find((point) => inBounds(point) && !blocked.has(pointKey(point)) && !seen.has(pointKey(point)));
    if (!candidate) continue;

    let parent = nearest;
    if (optimize) {
      const nearby = nodes.filter((node) => manhattan(node, candidate) <= 2);
      parent = nearby.reduce((best, node) => (nodeCost.get(pointKey(node))! < nodeCost.get(pointKey(best))! ? node : best), nearest);
    }

    seen.add(pointKey(candidate));
    nodes.push(candidate);
    parents.set(pointKey(candidate), parent);
    nodeCost.set(pointKey(candidate), (nodeCost.get(pointKey(parent)) ?? 0) + 1);

    if (samePoint(candidate, goal)) {
      const path = tracePath(parents, start, goal);
      return { path, explored: nodes, cost: Math.max(0, path.length - 1), duration: performance.now() - clock, message: "tree connected to goal" };
    }
  }

  const fallback = weightedSearch(start, goal, blocked, 1);
  return { ...fallback, explored: [...nodes, ...fallback.explored], message: fallback.path.length ? "tree completed via route repair" : "tree could not connect" };
}

function solveRoute(start: GridPoint, goal: GridPoint, blocked: Set<string>, algorithm: Algorithm): RouteResult {
  if (algorithm === "BFS") return breadthFirst(start, goal, blocked);
  if (algorithm === "Dijkstra") return weightedSearch(start, goal, blocked, 0);
  if (algorithm === "A*" || algorithm === "D* Lite") return weightedSearch(start, goal, blocked, 1);
  return randomTree(start, goal, blocked, algorithm === "RRT*");
}

export default function Home() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("A*");
  const [obstacles, setObstacles] = useState<Set<string>>(() => new Set(INITIAL_BLOCKS));
  const [robot, setRobot] = useState<GridPoint>(initialStart);
  const [toolMode, setToolMode] = useState<ToolMode>("obstacle");
  const [autoReplan, setAutoReplan] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(300);
  const [route, setRoute] = useState<RouteResult>(() => solveRoute(initialStart, initialGoal, new Set(INITIAL_BLOCKS), "A*"));
  const [eventState, setEventState] = useState<EventState>({
    label: "ROUTE STABLE",
    detail: "Initial route approved — 16 cells ahead.",
    tone: "calm",
  });

  const pathKeys = useMemo(() => new Set(route.path.map(pointKey)), [route.path]);
  const exploredKeys = useMemo(() => new Set(route.explored.map(pointKey)), [route.explored]);
  const pathAhead = route.path.filter((point) => !samePoint(point, robot)).length;
  const completion = route.path.length ? Math.max(0, Math.round(((route.path.length - pathAhead) / route.path.length) * 100)) : 0;

  useEffect(() => {
    if (!isRunning || route.path.length < 2) return;
    const timer = window.setTimeout(() => {
      const currentIndex = route.path.findIndex((point) => samePoint(point, robot));
      const nextIndex = currentIndex < 0 ? 1 : currentIndex + 1;
      if (nextIndex >= route.path.length) {
        setIsRunning(false);
        setEventState({ label: "GOAL REACHED", detail: "Robot completed the active mission route.", tone: "success" });
        return;
      }
      setRobot(route.path[nextIndex]);
      if (nextIndex === route.path.length - 1) {
        setIsRunning(false);
        setEventState({ label: "GOAL REACHED", detail: "Robot completed the active mission route.", tone: "success" });
      }
    }, speed);
    return () => window.clearTimeout(timer);
  }, [isRunning, robot, route.path, speed]);

  const computeAndSetRoute = (origin: GridPoint, blocks: Set<string>, method = algorithm, event?: EventState) => {
    const nextRoute = solveRoute(origin, initialGoal, blocks, method);
    setRoute(nextRoute);
    setEventState(
      event ?? {
        label: nextRoute.path.length ? "ROUTE UPDATED" : "ROUTE BLOCKED",
        detail: nextRoute.path.length ? `${method} mapped ${nextRoute.path.length - 1} cells to the goal.` : "Open a corridor, then rerun the planner.",
        tone: nextRoute.path.length ? "success" : "alert",
      },
    );
    return nextRoute;
  };

  const runMission = () => {
    const origin = samePoint(robot, initialGoal) ? initialStart : robot;
    if (samePoint(robot, initialGoal)) setRobot(initialStart);
    const nextRoute = computeAndSetRoute(origin, obstacles);
    setIsRunning(nextRoute.path.length > 1);
  };

  const injectObstacle = () => {
    const robotIndex = Math.max(0, route.path.findIndex((point) => samePoint(point, robot)));
    const candidate = route.path.slice(robotIndex + 2, -1).find((point) => !obstacles.has(pointKey(point)));
    if (!candidate) {
      setEventState({ label: "NO ROUTE SEGMENT", detail: "Run a mission before inserting a dynamic obstacle.", tone: "alert" });
      return;
    }
    const nextBlocks = new Set(obstacles);
    nextBlocks.add(pointKey(candidate));
    setObstacles(nextBlocks);
    setIsRunning(false);
    if (autoReplan) {
      const nextRoute = solveRoute(robot, initialGoal, nextBlocks, algorithm);
      setRoute(nextRoute);
      setEventState({
        label: nextRoute.path.length ? "OBSTACLE DETECTED" : "CORRIDOR LOST",
        detail: nextRoute.path.length ? `Map changed at X${candidate.x}, Y${candidate.y}; ${algorithm} replanned a new corridor.` : "No viable alternative corridor remains.",
        tone: nextRoute.path.length ? "alert" : "alert",
      });
    } else {
      setEventState({ label: "OBSTACLE DETECTED", detail: `Map changed at X${candidate.x}, Y${candidate.y}; planner is standing by.`, tone: "alert" });
    }
  };

  const resetScenario = () => {
    const nextBlocks = new Set(INITIAL_BLOCKS);
    setObstacles(nextBlocks);
    setRobot(initialStart);
    setIsRunning(false);
    const nextRoute = solveRoute(initialStart, initialGoal, nextBlocks, algorithm);
    setRoute(nextRoute);
    setEventState({ label: "WORLD RESET", detail: "Field map restored to the baseline obstacle course.", tone: "calm" });
  };

  const clearWorld = () => {
    const empty = new Set<string>();
    setObstacles(empty);
    setIsRunning(false);
    computeAndSetRoute(robot, empty, algorithm, { label: "WORLD CLEARED", detail: "All static barriers have been removed from the field.", tone: "success" });
  };

  const handleCellClick = (point: GridPoint) => {
    if (samePoint(point, initialGoal)) {
      setEventState({ label: "GOAL PROTECTED", detail: "The mission target cannot be overwritten.", tone: "alert" });
      return;
    }
    const nextBlocks = new Set(obstacles);
    setIsRunning(false);

    if (toolMode === "robot") {
      nextBlocks.delete(pointKey(point));
      setObstacles(nextBlocks);
      setRobot(point);
      if (autoReplan) computeAndSetRoute(point, nextBlocks);
      else setEventState({ label: "ROBOT RELOCATED", detail: `New start at X${point.x}, Y${point.y}.`, tone: "calm" });
      return;
    }

    if (samePoint(point, robot)) {
      setEventState({ label: "ROBOT OCCUPIED", detail: "Relocate the robot before editing its current cell.", tone: "alert" });
      return;
    }

    if (toolMode === "obstacle") {
      nextBlocks.add(pointKey(point));
      setObstacles(nextBlocks);
      if (autoReplan) computeAndSetRoute(robot, nextBlocks, algorithm, { label: "MAP CHANGE DETECTED", detail: `Barrier placed at X${point.x}, Y${point.y}; replanning route.`, tone: "alert" });
      else setEventState({ label: "BARRIER PLACED", detail: `Barrier recorded at X${point.x}, Y${point.y}.`, tone: "calm" });
      return;
    }

    nextBlocks.delete(pointKey(point));
    setObstacles(nextBlocks);
    if (autoReplan) computeAndSetRoute(robot, nextBlocks, algorithm, { label: "CELL CLEARED", detail: `Barrier removed at X${point.x}, Y${point.y}; route refreshed.`, tone: "success" });
    else setEventState({ label: "CELL CLEARED", detail: `Barrier removed at X${point.x}, Y${point.y}.`, tone: "calm" });
  };

  const changeAlgorithm = (value: Algorithm) => {
    setAlgorithm(value);
    setIsRunning(false);
    computeAndSetRoute(robot, obstacles, value, { label: "PLANNER SWITCHED", detail: `${value} is now evaluating the active world.`, tone: "calm" });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="logo-orbit" aria-hidden="true">
            <img src="/manus-storage/robopath-mark_1c15ba3d.png" alt="" />
          </div>
          <div>
            <p className="eyebrow">AUTONOMOUS NAVIGATION LAB</p>
            <h1>RoboPath</h1>
          </div>
        </div>
        <div className="mission-readout" aria-label="Current mission status">
          <span className="status-pulse" />
          <span>MISSION 07</span>
          <i />
          <span>GRID: 12 × 10</span>
          <i />
          <span>LIVE SIMULATION</span>
        </div>
        <div className="topbar-actions">
          <Button variant="ghost" className="top-action" onClick={resetScenario}>
            <RotateCcw size={15} /> RESET
          </Button>
          <Button className="run-button" onClick={runMission}>
            {isRunning ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
            {isRunning ? "PAUSE RUN" : "RUN MISSION"}
          </Button>
        </div>
      </header>

      <main className="workspace">
        <section className="intro-rail" aria-label="Simulation context">
          <div>
            <p className="eyebrow">LIVE PATH-PLANNING ENVIRONMENT</p>
            <h2>Routes change.<br />The mission holds.</h2>
          </div>
          <div className="intro-copy">
            <p>Build the world directly on the field. RoboPath watches each new barrier, evaluates the available terrain, and redraws the route before the robot loses its way.</p>
            <span><ScanLine size={15} /> Sensor sweep: active</span>
          </div>
        </section>

        <div className="mission-layout">
          <section className="field-section" aria-labelledby="field-title">
            <div className="field-toolbar">
              <div className="field-title-wrap">
                <div className="section-index">01</div>
                <div>
                  <p className="eyebrow">ACTIVE TEST RANGE</p>
                  <h3 id="field-title">WORLD / URBAN CORRIDOR</h3>
                </div>
              </div>
              <div className="field-coordinates">
                <span><Crosshair size={14} /> RBT X{robot.x} Y{robot.y}</span>
                <span><Target size={14} /> GOAL X{initialGoal.x} Y{initialGoal.y}</span>
              </div>
            </div>

            <div className="field-frame">
              <div className="world-plot" style={{ backgroundImage: "url('/manus-storage/robopath-field-texture_ad3ece2e.jpg')" }}>
                <div className="plot-corner corner-top-left">NORTH / +Y</div>
                <div className="plot-corner corner-top-right">RANGE 00.48 KM²</div>
                <div className="plot-corner corner-bottom-left">X AXIS →</div>
                <div className="plot-corner corner-bottom-right">CELL 1 M</div>
                <div className="world-grid" role="grid" aria-label="Editable obstacle course">
                  {Array.from({ length: GRID_HEIGHT }, (_, y) =>
                    Array.from({ length: GRID_WIDTH }, (_, x) => {
                      const point = { x, y };
                      const key = pointKey(point);
                      const isObstacle = obstacles.has(key);
                      const isRobot = samePoint(point, robot);
                      const isGoal = samePoint(point, initialGoal);
                      const isPath = pathKeys.has(key);
                      const isExplored = exploredKeys.has(key);
                      return (
                        <button
                          key={key}
                          className={`world-cell ${isObstacle ? "cell-obstacle" : ""} ${isPath ? "cell-path" : ""} ${isExplored ? "cell-explored" : ""} ${isRobot ? "cell-robot" : ""} ${isGoal ? "cell-goal" : ""}`}
                          onClick={() => handleCellClick(point)}
                          aria-label={`Cell x ${x}, y ${y}${isObstacle ? ", obstacle" : ""}${isRobot ? ", robot" : ""}${isGoal ? ", goal" : ""}`}
                          role="gridcell"
                        >
                          {isExplored && !isPath && !isObstacle && <span className="exploration-dot" />}
                          {isPath && !isRobot && !isGoal && !isObstacle && <span className="path-mark" />}
                          {isObstacle && <span className="obstacle-mark" />}
                          {isRobot && <span className="robot-marker"><span /><i /></span>}
                          {isGoal && <Target className="goal-icon" size={18} strokeWidth={2.3} />}
                        </button>
                      );
                    }),
                  )}
                </div>
                <div className="world-legend" aria-label="Map legend">
                  <span><b className="legend-robot" />ROBOT</span>
                  <span><b className="legend-route" />ROUTE</span>
                  <span><b className="legend-obstacle" />BARRIER</span>
                  <span><b className="legend-goal" />GOAL</span>
                </div>
              </div>
            </div>

            <div className="field-controls">
              <div className="tool-cluster">
                <p className="eyebrow">FIELD TOOL</p>
                <div className="tool-buttons">
                  <button className={toolMode === "obstacle" ? "tool-button is-selected" : "tool-button"} onClick={() => setToolMode("obstacle")}><Plus size={15} /> BARRIER</button>
                  <button className={toolMode === "robot" ? "tool-button is-selected" : "tool-button"} onClick={() => setToolMode("robot")}><Bot size={15} /> RELOCATE</button>
                  <button className={toolMode === "eraser" ? "tool-button is-selected" : "tool-button"} onClick={() => setToolMode("eraser")}><Eraser size={15} /> ERASE</button>
                </div>
              </div>
              <div className="field-instructions">Click a cell to {toolMode === "obstacle" ? "place a barrier" : toolMode === "robot" ? "relocate the robot" : "clear the terrain"}.</div>
              <button className="clear-button" onClick={clearWorld}><Trash2 size={14} /> CLEAR WORLD</button>
            </div>
          </section>

          <aside className="route-dossier" aria-label="Planning controls and diagnostics">
            <section className="dossier-block algorithm-block">
              <div className="block-heading">
                <div className="section-index">02</div>
                <div><p className="eyebrow">PLANNING CORE</p><h3>ROUTE METHOD</h3></div>
              </div>
              <label className="algorithm-select-label" htmlFor="algorithm-select">ACTIVE ALGORITHM</label>
              <div className="select-wrap">
                <select id="algorithm-select" value={algorithm} onChange={(event) => changeAlgorithm(event.target.value as Algorithm)}>
                  {(Object.keys(algorithmDescriptions) as Algorithm[]).map((name) => <option value={name} key={name}>{name}</option>)}
                </select>
                <Compass size={17} />
              </div>
              <p className="algorithm-definition">{algorithmDescriptions[algorithm]}</p>
              <div className="algorithm-chip-row">
                {(Object.keys(algorithmDescriptions) as Algorithm[]).map((name) => <button key={name} onClick={() => changeAlgorithm(name)} className={name === algorithm ? "algorithm-chip active" : "algorithm-chip"}>{name}</button>)}
              </div>
            </section>

            <section className="dossier-block sensor-block">
              <div className="sensor-visual">
                <img src="/manus-storage/robopath-route-illustration_197a72f7.jpg" alt="Autonomous ground robot rerouting around a newly detected obstacle" />
                <div className="sensor-overlay"><Radar size={16} /> REALTIME MAP UPDATE</div>
              </div>
              <div className="sensor-controls">
                <div>
                  <p className="eyebrow">DYNAMIC WORLD</p>
                  <h3>OBSERVATION LOOP</h3>
                </div>
                <Switch checked={autoReplan} onCheckedChange={setAutoReplan} aria-label="Automatic replanning" />
              </div>
              <p className="sensor-copy">Automatic replanning is <strong>{autoReplan ? "armed" : "paused"}</strong>. New obstacles trigger an immediate route evaluation.</p>
              <Button className="inject-button" variant="outline" onClick={injectObstacle}><MapPin size={16} /> INJECT OBSTACLE <ArrowUpRight size={14} /></Button>
            </section>

            <section className={`event-block event-${eventState.tone}`}>
              <div className="event-topline"><Activity size={15} /><span>SYSTEM EVENT</span><em>NOW</em></div>
              <h4>{eventState.label}</h4>
              <p>{eventState.detail}</p>
            </section>
          </aside>
        </div>

        <section className="metrics-strip" aria-labelledby="metrics-title">
          <div className="metrics-intro">
            <div className="section-index">03</div>
            <div><p className="eyebrow">NAVIGATION TELEMETRY</p><h3 id="metrics-title">MEASUREMENTS</h3></div>
          </div>
          <div className="metric-item"><span>PATH COST</span><strong>{route.path.length ? route.cost.toString().padStart(2, "0") : "--"}<small> cells</small></strong><i /></div>
          <div className="metric-item"><span>SEARCHED</span><strong>{route.explored.length.toString().padStart(3, "0")}<small> nodes</small></strong><i /></div>
          <div className="metric-item"><span>RESPONSE</span><strong>{route.duration.toFixed(2)}<small> ms</small></strong><i /></div>
          <div className="metric-item"><span>MISSION</span><strong>{completion.toString().padStart(2, "0")}<small> %</small></strong><i /></div>
          <div className="speed-control">
            <div><span>SPEED</span><b>{Math.round((600 - speed) / 3)}%</b></div>
            <input aria-label="Robot speed" type="range" min="120" max="520" step="20" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
          </div>
        </section>

        <section className="architecture-rail" aria-label="RoboPath module structure">
          <div className="module-prompt"><ScanLine size={16} /> ROBOPATH STACK</div>
          {["world/", "robot/", "planning/", "navigation/", "perception/", "simulation/", "metrics/", "api/", "frontend/", "tests/"].map((module) => <span key={module}>{module}</span>)}
          <p>Simulation-ready workflow. Designed for C++ planners, FastAPI telemetry, React controls, and Three.js visualization.</p>
        </section>
      </main>
    </div>
  );
}
