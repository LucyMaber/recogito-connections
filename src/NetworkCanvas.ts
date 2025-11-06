import { SVG, Container } from '@svgdotjs/svg.js';
import { TinyEmitter as EventEmitter } from 'tiny-emitter';
import { v4 as uuid } from 'uuid';

import NetworkEdge, { W3CAnnotation, AnnotationBody } from './NetworkEdge';
import NetworkNode from './NetworkNode';
import SVGEdge from './svg/SVGEdge';
import SVGFloatingEdge from './svg/SVGFloatingEdge';
import SVGHoveredNode from './svg/SVGHoveredNode';

import './NetworkCanvas.scss';

export interface AnnotoriousInstance {
  setAnnotations(annotations: W3CAnnotation[]): Promise<void>;
  on(event: string, handler: (annotation: W3CAnnotation) => void): void;
  disableSelect: boolean;
}

export interface NetworkCanvasConfig {
  showLabels?: boolean;
  vocabulary?: string[];
  disableEditor?: boolean;
}

/** Checks if the given DOM element represents an annotation **/
const isAnnotation = (element: Element) =>
  element.classList?.contains('r6o-annotation') ||
  element.closest('.a9s-annotation');

/** Checks if the given DOM element is a connection handle **/
const isHandle = (element: Element | null) =>
  element?.closest && element.closest('.r6o-connections-hover');

export default class NetworkCanvas extends EventEmitter {

  instances: AnnotoriousInstance[];
  config: NetworkCanvasConfig;
  svg: Container;
  connections: SVGEdge[];
  currentHover: SVGHoveredNode | null;
  currentFloatingEdge: SVGFloatingEdge | null;

  constructor(instances: AnnotoriousInstance[], config: NetworkCanvasConfig) {
    super();

    // List of RecogitoJS/Annotorious instances
    this.instances = instances;

    this.config = config;

    this.svg = SVG().addTo('body');
    this.svg.attr('class', 'r6o-connections-canvas');

    this.initGlobalEvents();

    this.connections = [];

    // Current hover highlight
    this.currentHover = null;

    // Current floating network edge (drawn by the user)
    this.currentFloatingEdge = null;
  }

  addEdge = (edge: NetworkEdge): SVGEdge => {
    const svgEdge = new SVGEdge(edge, this.svg, this.config);

    svgEdge.on('click', () =>
      this.emit('selectConnection', edge.toAnnotation(), svgEdge.midpoint));

    this.connections.push(svgEdge);
    return svgEdge;
  }

  /** 
   * Deletes all connections connected to the annotation
   * with the given ID. Returns the deleted connections.
   */
  deleteConnectionsForId = (id: string): W3CAnnotation[] => {
    const toDelete = this.connections.filter((conn: SVGEdge) => {
      const start = conn.edge.start.annotation.id;
      const end = conn.edge.end.annotation.id;
      return start === id || end === id;
    });

    // Delete connections marked for deletion
    this.connections = this.connections.filter((conn: SVGEdge) => {      
      const markedForDelete = toDelete.includes(conn);
      if (markedForDelete)
        conn.remove();

      return !markedForDelete;
    });

    return (toDelete.map((conn: SVGEdge) => conn.edge.toAnnotation()) as W3CAnnotation[]);
  }

  destroy = (): void => {
    this.svg.remove();
  }

  initGlobalEvents = (): void => {
    const opts = {
      capture: true,
      passive: true
    }

    document.addEventListener('mouseover', (evt: MouseEvent) => {
      if (isAnnotation(evt.target as Element))
        this.onEnterAnnotation(evt as MouseEvent);
    }, opts);

    document.addEventListener('mouseout', (evt: MouseEvent) => {
      if (isAnnotation(evt.target as Element)) {
        // Note: entering the connection handle will also cause  a
        // mouseleave event for the annotation!
        if (!isHandle(evt.relatedTarget as Element))
          this.onLeaveAnnotation();
      }
    });

    // Common 'click' behavior, used both for mousedown and drag + mouseup
    const onClick = () => {
      if (this.currentFloatingEdge && this.currentFloatingEdge.isSnapped())
        this.onCompleteConnection();
    }

    document.addEventListener('mousedown', onClick);
    document.addEventListener('mouseup', onClick)

    document.addEventListener('mousemove', this.onMouseMove);

    document.addEventListener('keyup', (evt: KeyboardEvent) => {
      if (evt.code === 'Escape' && this.currentFloatingEdge)
        this.onCancelConnection(); 
    });

    window.addEventListener('scroll', () => this.redraw(), true);

    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() =>
        this.redraw(true));

      if (this.svg.node.parentNode instanceof Element)
        resizeObserver.observe(this.svg.node.parentNode);
    }

    this.instances.forEach((instance: AnnotoriousInstance) => {
      instance.on('changeSelectionTarget', (_target: W3CAnnotation) => {
        // TODO only redraw if the target has connections!
        // TODO only redraw affected connections
        this.redraw();
      })
    });
  }

  initHoverEvents = (hover: SVGHoveredNode): void => {
    hover.on('startConnection', () => this.onStartConnection(hover.node));
    hover.on('mouseout', this.onLeaveAnnotation);
  }

  onCancelConnection = (): void => {
    this.currentFloatingEdge!.remove();
    this.currentFloatingEdge = null;

    this.instances.forEach((i: AnnotoriousInstance) => i.disableSelect = false);

    document.body.classList.remove('r6o-hide-cursor');
  }

  onCompleteConnection = (): void => {
    const { start, end } = this.currentFloatingEdge!;

    const id = `#${uuid()}`;

    const edge = new NetworkEdge(id, start as NetworkNode, end as NetworkNode);

    const annotation = edge.toAnnotation();

    const svgEdge = this.addEdge(edge);

    this.emit('createConnection', annotation, svgEdge.midpoint);
    
    setTimeout(() => this.instances.forEach((i: AnnotoriousInstance) => i.disableSelect = false), 100);

    document.body.classList.remove('r6o-hide-cursor');

    this.currentFloatingEdge!.remove();
    this.currentFloatingEdge = null;
  }

  /**
   * When entering an annotation show hover emphasis. If there's no
   * dragged arrow, show connection handle. If there is a dragged 
   * arrow, snap it.
   */
  onEnterAnnotation = (evt: MouseEvent): void => {
    const annotation = (evt.target as any)?.annotation || (evt.target as any).closest('.a9s-annotation')?.annotation;
    const { clientX, clientY } = evt;

    // Destroy previous hover, if any
    if (this.currentHover)
      this.currentHover.remove();

    // Network node for this hover
    const node = new NetworkNode(annotation, { x: clientX, y: clientY });

    // Draw handle if there's no floating edge yet
    const drawHandle = !this.currentFloatingEdge;
    this.currentHover = new SVGHoveredNode(node, this.svg, drawHandle);
    this.initHoverEvents(this.currentHover);

    // If there is a floating connection already, snap
    if (this.currentFloatingEdge)
      this.currentFloatingEdge.snapTo(node);
  }

  onLeaveAnnotation = (): void => {
    this.currentHover?.remove();
    this.currentHover = null;
  }

  onMouseMove = (evt: MouseEvent): void => {
    // If there is a current floating edge and it's not snapped, 
    // drag it to mouse position
    if (this.currentFloatingEdge) {
      if (this.currentHover) {
        document.body.classList.remove('r6o-hide-cursor');
      } else {
        this.currentFloatingEdge.dragTo(evt.clientX, evt.clientY);
        document.body.classList.add('r6o-hide-cursor');
      }
    }
  }

  onStartConnection = (node: NetworkNode): void => {
    this.currentFloatingEdge = new SVGFloatingEdge(node, this.svg);

    // Disable selection on RecogitoJS/Annotorious
    this.instances.forEach((i: AnnotoriousInstance) => i.disableSelect = true);
  }

  redraw = (reflow?: boolean): void => {
    if (this.currentHover)
      this.currentHover.redraw();

    if (reflow)
      this.connections.forEach((connection: SVGEdge) => connection.resetAttachment());

    this.connections.forEach((connection: SVGEdge) => connection.redraw());
  }

  registerInstance = (instance: AnnotoriousInstance): void => {
    this.instances.push(instance);
  }

  removeConnection = (connection: W3CAnnotation): void => {
    const toRemove = this.connections.find((c: SVGEdge) => 
      c.edge.matchesAnnotation(connection));

    this.connections = this.connections.filter((c: SVGEdge) => c !== toRemove);
    
    toRemove?.remove();
  }

  setAnnotations = (annotations: W3CAnnotation[]): void => annotations.forEach((a: W3CAnnotation) => {
    // Expect upstream-serialized W3C annotations (with `target` and `body`).
    const ann = a;

    const targets = Array.isArray(ann?.target) ? ann.target : null;

    if (!targets || targets.length < 2) {
      console.warn('Annotation does not contain two targets:', ann);
      return;
    }

    const startId = targets[0].id;
    const endId = targets[1].id;

    if (!startId || !endId) {
      console.warn('Targets missing id field:', targets);
      return;
    }

    const start = NetworkNode.findById(startId);
    const end = NetworkNode.findById(endId);

    if (!start || !end) {
      console.warn('Could not find start or end node for annotation', ann);
      return; 
    }

    const bodies = ann.body || [];

    this.addEdge(new NetworkEdge(ann.id, start, end, bodies));
  });

  unregisterInstance = (instance: AnnotoriousInstance): void => {
    this.instances = this.instances.filter((i: AnnotoriousInstance) => i !== instance);
  }

  updateConnectionData = (connection: W3CAnnotation, bodies: AnnotationBody[]): void => {
    const toUpdate = this.connections.find((c: SVGEdge) =>
      c.edge.matchesAnnotation(connection));

    if (!toUpdate) {
      console.warn('Could not find connection to update', connection);
      return;
    }

    if (typeof toUpdate.setData === 'function')
      toUpdate.setData(bodies);
  }

}
