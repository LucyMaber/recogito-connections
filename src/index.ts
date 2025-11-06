import { TinyEmitter as EventEmitter } from 'tiny-emitter';
// NOTE: This plugin assumes upstream-serialized annotation objects (W3C/W3CTEI)
// with a `target` array (two entries) and a `body` array. Compatibility
// fallbacks for wrappers (e.g. `.underlying`) and plural `bodies` were removed.
import NetworkCanvas, { AnnotoriousInstance, NetworkCanvasConfig } from './NetworkCanvas';
import mountEditor from './editor/mountEditor';
import { W3CAnnotation } from './NetworkEdge';

interface PluginConfig extends NetworkCanvasConfig {
  disableEditor?: boolean;
}

/** Checks if the given annotation represents a connection (upstream W3C shape) **/
const isConnection = (annotation: W3CAnnotation): boolean => {
  const targets = Array.isArray(annotation.target) ? annotation.target : null;

  if (!targets || targets.length !== 2) return false;

  return targets.every((t: { id?: string }) => t && t.id);
}

class ConnectionsPlugin extends EventEmitter {

  instances: AnnotoriousInstance[];
  canvas: NetworkCanvas;

  constructor(arg: AnnotoriousInstance | AnnotoriousInstance[], conf: PluginConfig) {
    super();

    const instances: AnnotoriousInstance[] = arg ? (Array.isArray(arg) ? arg : [arg]) : [];
    
    // Configuration options
    const config: PluginConfig = conf || {};

    // RecogitoJS/Annotorious instances
    this.instances = instances;

    // Single network canvas, covering the browser viewport
    this.canvas = new NetworkCanvas(this.instances, config);

    this.instances.forEach((i: AnnotoriousInstance) => this.patchInstance(i));
  
    if (!config.disableEditor)
      mountEditor(this.canvas, this, config); 
  }

  /**
   * Applies plugin intercepts to a RecogitoJS/Annotorious instance.
   */
  patchInstance = (instance: AnnotoriousInstance): void => {

    // Intercept + monkeypatch API methods
    const _setAnnotations = instance.setAnnotations;

    instance.setAnnotations = async (arg: W3CAnnotation[]) => {
      const all = (arg || []);

      // Split text annotations from connections
      const annotations = all.filter((a: W3CAnnotation) => !isConnection(a));
      const connections = all.filter((a: W3CAnnotation) => isConnection(a));
      
      // Set annotations on instance first
      await _setAnnotations(annotations);
      
      // Then create relations. Connections are passed as plain serialized
      // annotation objects (W3C/W3CTEI). Ensure `body` is an array.
      const normalized = connections.map((a: W3CAnnotation) => {
        const ann = (a || {}) as any;
        const body = ann.body || [];
        return { ...ann, body: Array.isArray(body) ? body : [body] };
      });
      this.canvas.setAnnotations(normalized);
    }

    // When annotations are deleted, also delete
    // in-/outgoing connections
    instance.on('deleteAnnotation', (annotation: W3CAnnotation) => {
      const deleted = this.canvas.deleteConnectionsForId(annotation.id);
      deleted.forEach((deletedAnnotation: W3CAnnotation) => {
        // annotation is a plain serialized object
        this.emit('deleteConnection', deletedAnnotation);
      });
    });
  }

  destroy = (): void => {
    this.canvas.destroy();
  }

  register = (instance: AnnotoriousInstance): void => {
    this.patchInstance(instance);

    this.canvas.registerInstance(instance);

    this.instances.push(instance);
  }

  unregister = (instance: AnnotoriousInstance): void => {
    // TODO need to remove patching!
    this.instances = this.instances.filter((i: AnnotoriousInstance) => i !== instance);
    this.canvas.unregisterInstance(instance);
  }

}

export default (instances: AnnotoriousInstance | AnnotoriousInstance[], config: PluginConfig) => new ConnectionsPlugin(instances, config);
