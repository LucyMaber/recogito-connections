import { serializeW3CTEIAnnotation, serializeW3CTextAnnotation } from '@recogito/react-text-annotator';

export default class NetworkEdge {

  constructor(id, start, end, bodies) {
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

  matchesAnnotation = annotation => {
    // Expect a plain, upstream-serialized W3C annotation object.
    const ann = annotation;

    const targets = Array.isArray(ann?.target) ? ann.target : null;

    if (!targets || targets.length < 2)
      return false;

    const start = targets[0].id;
    const end = targets[1].id;

    return this.start.annotation.id === start && this.end.annotation.id === end;
  }

  toAnnotation = () => {
    const raw = {
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
    let serialized = raw;
    try {
      if (typeof serializeW3CTEIAnnotation === 'function') serialized = serializeW3CTEIAnnotation(raw);
      else if (typeof serializeW3CTextAnnotation === 'function') serialized = serializeW3CTextAnnotation(raw);
    } catch (e) {
      // fall back to raw
      serialized = raw;
    }

    // Return a plain serialized annotation object (W3C / W3CTEI) so the
    // rest of the code can work with canonical upstream types.
    return serialized;
  };

}