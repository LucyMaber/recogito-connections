import React, { Component } from 'react';
import Autocomplete from './widgets/Autocomplete';
import { TrashIcon, CheckIcon } from '../Icons';
import { W3CAnnotation, AnnotationBody } from '../NetworkEdge';

import './RelationEditor.scss';

interface Props {
  config: {
    vocabulary?: string[];
    [key: string]: any;
  };
  onConnectionCreated: (annotation: W3CAnnotation) => void;
  onConnectionUpdated: (annotation: W3CAnnotation, previous: W3CAnnotation) => void;
  onConnectionDeleted: (annotation: W3CAnnotation) => void;
}

interface State {
  connection: W3CAnnotation | null;
  top: number;
  left: number;
  isNew: boolean;
  inputValue: string;
}

/**
 * A simple editor for adding a single relation tag body
 * to a connection.
 */
export default class PayloadEditor extends Component<Props, State> {

  el: React.RefObject<HTMLDivElement>;

  constructor(props: Props) {
    super(props);

    this.el = React.createRef();

    this.state = {
      connection: null,
      top: 0,
      left: 0,
      isNew: false,
      inputValue: ''
    }
  }

  componentDidUpdate(): void {
    if (this.el.current)
      this.el.current.querySelector('input')?.focus();
  }

  close = (optCallback?: () => void): void =>
    this.setState({
      connection: null,
      isNew: false,
      inputValue: ''
    }, () => optCallback && optCallback());

  editConnection(connection: W3CAnnotation, pos: { x: number; y: number }, isNew: boolean): void {
    const top = pos.y + window.scrollY;
    const left = pos.x + window.scrollX;

    const bodies = connection.body || [];
    const inputValue = (bodies.find((b: AnnotationBody) => b.purpose === 'tagging')?.value || '') as string;

    const setState = () =>
      this.setState({ connection, top, left, isNew, inputValue });
  
    if (this.state.connection)
      this.close(setState); // Close first, so that the Autocomplete re-renders initial value
    else
      setState();
  }

  onChange = (inputValue: string): void => {
    this.setState({ inputValue });
  }

  onSubmit = (value?: string): void => {
    const inputValue = value ? value : this.state.inputValue;
    
    if (value)
      this.setState({ inputValue });

    // Create an updated plain annotation object (W3C shape)
    const updated: W3CAnnotation = JSON.parse(JSON.stringify(this.state.connection || {}));
    updated.body = [{
      type: 'TextualBody',
      value: inputValue,
      purpose: 'tagging'
    } as AnnotationBody];

    if (this.state.isNew)
      this.props.onConnectionCreated(updated);
    else
      this.props.onConnectionUpdated(updated, this.state.connection!);

    this.close();
  }

  onDelete = (): void => {
    this.props.onConnectionDeleted(this.state.connection!);
    this.close();
  }

  render(): React.ReactNode {
    return this.state.connection ? (
      <div
        ref={this.el}
        style={{ top: this.state.top, left: this.state.left }} 
        className="r6o-connections-editor">

        <div className="r6o-connections-editor-input-wrapper">
          <Autocomplete 
            placeholder="Tag..."
            initialValue={this.state.inputValue}
            onSubmit={this.onSubmit} 
            onChange={this.onChange}
            onCancel={this.close}
            vocabulary={this.props.config.vocabulary || []} />
        </div>

        <div className="r6o-connections-editor-buttons">
          <span 
            className="r6o-icon delete"
            onClick={this.onDelete}>
            <TrashIcon width={14} />
          </span>

          <span
            className="r6o-icon ok"
            onClick={() => this.onSubmit()}>
            <CheckIcon width={14} />
          </span>
        </div>
      </div>
    ) : null;
  }

}
