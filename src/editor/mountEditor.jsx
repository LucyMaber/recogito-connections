import React from 'react';
import ReactDOM from 'react-dom';

import RelationEditor from './RelationEditor';

const mountEditor = (canvas, emitter, config) => {

  // A div container to hold the editor
  const container = document.createElement('div');
  document.getElementsByTagName('body')[0].appendChild(container);

  // React editor ref
  const editor = React.createRef();


  const handleConnectionCreated = annotation => {
    // annotation is a plain serialized annotation object
    emitter.emit('createConnection', annotation);
    canvas.updateConnectionData(annotation, annotation.body || []);
  }

  const handleConnectionUpdated = (annotation, previous) => {
    emitter.emit('updateConnection', annotation, previous);
    canvas.updateConnectionData(previous, annotation.body || []);
  }

  const handleConnectionDeleted = annotation => {
    emitter.emit('deleteConnection', annotation);
    canvas.removeConnection(annotation);
  }

  // JSX editor component
  // Support both legacy ReactDOM.render and the React 18+ createRoot API.
  let didRender = false;
  try {
    const client = require('react-dom/client');
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
  canvas.on('createConnection', (connection, pos) =>
    editor.current && editor.current.editConnection(connection, pos, true));

  canvas.on('selectConnection', (connection, pos) =>
    editor.current && editor.current.editConnection(connection, pos, false));

}

export default mountEditor;