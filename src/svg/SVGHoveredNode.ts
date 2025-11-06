import { TinyEmitter as EventEmitter } from 'tiny-emitter';
import { Container } from '@svgdotjs/svg.js';

import { 
  TETHER_LENGTH,
  DOT_SIZE,
  HANDLE_SIZE,
  MOUSE_BUFFER
} from './Config';
import NetworkNode from '../NetworkNode';

/**
 * A compound SVG shape representing a network node currently
 * under the mouse. Optionally with a drag handle or not.
 */
export default class SVGHoveredNode extends EventEmitter {

  node: NetworkNode;
  drawHandle: boolean;
  g: Container;
  eventHandlers: Record<string, any>;

  constructor(node: NetworkNode, svg: Container, drawHandle: boolean) {
    super();

    this.node = node;
    this.drawHandle = drawHandle;

    // SVG shape container
    this.g = svg.group().attr('class', 'r6o-connections-hover');

    // Create outline path
    this.g.path()
      .attr('class', 'r6o-connections-hover-emphasis');

    // Create handle shapes
    if (drawHandle) {
      const handle = this.g.group()
        .attr('class', 'r6o-connections-handle has-events');

      // Connecting line between dot and grab circle
      handle.line()
        .attr('class', 'r6o-connections-handle-tether');

      // Small bottom dot
      handle.circle()
        .attr('class', 'r6o-connections-handle-dot')
        .radius(DOT_SIZE);

      // Handle circles
      handle.circle()
        .attr('class', 'r6o-connections-handle-outer')
        .radius(HANDLE_SIZE);

      handle.circle()
        .attr('class', 'r6o-connections-handle-inner')
        .radius(HANDLE_SIZE / 2);

      // Mouse event trap on top
      handle.rect()
        .attr('width', HANDLE_SIZE * 2 + 2 * MOUSE_BUFFER)
        .attr('height', HANDLE_SIZE + TETHER_LENGTH + DOT_SIZE + 2 * MOUSE_BUFFER)
        .attr('class', 'r6o-connections-handle-mousetrap')
        .mouseout(() => this.emit('mouseout', this.node));

      handle.mousedown(() => this.emit('startConnection', this.node));
    }

    this.eventHandlers = {};

    // Initial render
    this.redraw();
  }
  
  _redrawOutline = (): void => {
    (this.g.find('.r6o-connections-hover-emphasis') as any).attr('d', (this.node.faces as any)?.svg());
  }

  _redrawHandle = (): void => {
    const attachableRect = this.node.getAttachableRect();
    if (!attachableRect) return;

    const { x, y, width } = attachableRect;

    const cx = Math.round(x + width / 2);
    const cy = Math.round(y);

    (this.g.find('.r6o-connections-handle-mousetrap') as any)
      .attr('x', cx - HANDLE_SIZE - MOUSE_BUFFER)
      .attr('y', cy - TETHER_LENGTH - HANDLE_SIZE - MOUSE_BUFFER);

    (this.g.find('.r6o-connections-handle-dot') as any)
      .attr('cx', cx)
      .attr('cy', cy + Math.ceil(DOT_SIZE / 2));

    (this.g.find('.r6o-connections-handle-tether') as any)
      .attr('x1', cx)
      .attr('y1', cy)
      .attr('x2', cx)
      .attr('y2', cy - TETHER_LENGTH);

    (this.g.find('.r6o-connections-handle-inner') as any)
      .attr('cx', cx)
      .attr('cy', cy - TETHER_LENGTH);

    (this.g.find('.r6o-connections-handle-outer') as any)
      .attr('cx', cx)
      .attr('cy', cy - TETHER_LENGTH);
  }

  redraw = (): void => {
    this._redrawOutline();

    if (this.drawHandle)
      this._redrawHandle();
  }

  remove = (): void => {
    this.g.remove();
  }

}
