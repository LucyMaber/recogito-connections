import React from 'react';
import ReactDOM from 'react-dom';

import RelationEditor from './RelationEditor';
import NetworkCanvas from '../NetworkCanvas';
import { W3CAnnotation } from '../NetworkEdge';

interface ConnectionsEmitter {
  emit(event: string, ...args: any[]): void;
}

export interface EditorConfig {
  showLabels?: boolean;
  [key: string]: any;
}

const mountEditor = (canvas: NetworkCanvas, emitter: ConnectionsEmitter, config: EditorConfig): void => {

  // A div container to hold the editor
  const container = document.createElement('div');
  document.getElementsByTagName('body')[0].appendChild(container);

  // React editor ref
  const editor = React.createRef<RelationEditor>();


  const handleConnectionCreated = (annotation: W3CAnnotation): void => {
    // annotation is a plain serialized annotation object
    emitter.emit('createConnection', annotation);
    canvas.updateConnectionData(annotation, annotation.body || []);
  }

  const handleConnectionUpdated = (annotation: W3CAnnotation, previous: W3CAnnotation): void => {
    emitter.emit('updateConnection', annotation, previous);
    canvas.updateConnectionData(previous, annotation.body || []);
  }

  const handleConnectionDeleted = (annotation: W3CAnnotation): void => {
    emitter.emit('deleteConnection', annotation);
    canvas.removeConnection(annotation);
  }

  // JSX editor component
  // Support both legacy ReactDOM.render and the React 18+ createRoot API.
  let didRender = false;
  try {
    const client = require('react-dom/client') as { createRoot?: (container: Element) => { render: (jsx: React.ReactElement) => void } };
    if (client && typeof client.createRoot === 'function') {
      client.createRoot(container).render(
        <RelationEditor
          ref={editor}
          config={config}
          onConnectionCreated={handleConnectionCreated}
          onConnectionUpdated={handleConnectionUpdated}
          onConnectionDeleted={handleConnectionDeleted} />
      );
      didRender = true;
    }
  } catch (e) {
    // ignore - fall back to legacy API
  }

  if (!didRender) {
    ReactDOM.render(
      <RelationEditor 
        ref={editor} 
        config={config} 
        onConnectionCreated={handleConnectionCreated}
        onConnectionUpdated={handleConnectionUpdated}
        onConnectionDeleted={handleConnectionDeleted} />, container);
  }

  // Attach handlers to NetworkCanvas after the editor has mounted so
  // `editor.current` is defined.
  (canvas as any).on('createConnection', (connection: W3CAnnotation, pos: { x: number; y: number }) =>
    editor.current && editor.current.editConnection(connection, pos, true));

  (canvas as any).on('selectConnection', (connection: W3CAnnotation, pos: { x: number; y: number }) =>
    editor.current && editor.current.editConnection(connection, pos, false));

}

export default mountEditor;
