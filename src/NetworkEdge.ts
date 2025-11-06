import { serializeW3CTextAnnotation } from '@recogito/text-annotator';
import NetworkNode from './NetworkNode';

export interface AnnotationBody {
  type?: string;
  value?: any;
  purpose?: string;
  [key: string]: any;
}

export interface W3CAnnotation {
  id: string;
  body: AnnotationBody[];
  motivation?: string;
  target: Array<{ id: string }>;
  [key: string]: any;
}

export default class NetworkEdge {

  id: string;
  start: NetworkNode;
  end: NetworkNode;
  bodies: AnnotationBody[];

  constructor(id: string, start: NetworkNode, end: NetworkNode, bodies?: AnnotationBody[]) {
    this.id = id;

    this.start = start;
    this.end = end;
    
    // Ensure bodies is always an array to avoid runtime errors where
    // callers assume Array methods (e.g. .find) are available.
    if (Array.isArray(bodies)) {
      this.bodies = bodies;
    } else if (bodies && typeof bodies === 'object') {
      this.bodies = [bodies];
    } else {
      this.bodies = [];
    }
  }

  matchesAnnotation = (annotation: W3CAnnotation): boolean => {
    // Expect a plain, upstream-serialized W3C annotation object.
    const ann = annotation;

    const targets = Array.isArray(ann?.target) ? ann.target : null;

    if (!targets || targets.length < 2)
      return false;

    const start = targets[0].id;
    const end = targets[1].id;

    return this.start.annotation.id === start && this.end.annotation.id === end;
  }

  toAnnotation = (): W3CAnnotation => {
    const raw: W3CAnnotation = {
      id: this.id,
      body: this.bodies,
      motivation: 'linking',
      target: [
        { id: this.start.annotation.id },
        { id: this.end.annotation.id }
      ]
    };

    // Prefer TEI serializer when available, otherwise fall back to generic
    // W3C serializer; if neither available, use the raw object.
    let serialized: W3CAnnotation = raw;
    try {
      if (typeof serializeW3CTextAnnotation === 'function') serialized = serializeW3CTextAnnotation(raw as any, '') as any;
    } catch (e) {
      // fall back to raw
      serialized = raw;
    }

    // Return a plain serialized annotation object (W3C / W3CTEI) so the
    // rest of the code can work with canonical upstream types.
    return serialized;
  };

}
