import classNames from 'classnames';
import includes from 'lodash/includes';
import get from 'lodash/get';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Widget from '../../components/Widget';
import confirm from '../../lib/confirm';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import store from '../../store';
import Spindle from './Spindle';
import {
    // Grbl
    GRBL,
    GRBL_ACTIVE_STATE_IDLE,
    GRBL_ACTIVE_STATE_HOLD,
    // Smoothie
    SMOOTHIE,
    SMOOTHIE_ACTIVE_STATE_IDLE,
    SMOOTHIE_ACTIVE_STATE_HOLD,
    // TinyG
    TINYG,
    TINYG_MACHINE_STATE_READY,
    TINYG_MACHINE_STATE_STOP,
    TINYG_MACHINE_STATE_END,
    TINYG_MACHINE_STATE_HOLD,
    // Workflow
    WORKFLOW_STATE_RUN
} from '../../constants';
import styles from './index.styl';

class SpindleWidget extends Component {
    static propTypes = {
        onDelete: PropTypes.func,
        sortable: PropTypes.object
    };
    static defaultProps = {
        onDelete: () => {}
    };

    actions = {
        toggleFullscreen: () => {
            const { isFullscreen } = this.state;
            this.setState({ isFullscreen: !isFullscreen });
        },
        toggleMinimized: () => {
            const { minimized } = this.state;
            this.setState({ minimized: !minimized });
        },
        deleteWidget: () => {
            confirm({
                title: i18n._('Delete Widget'),
                body: i18n._('Are you sure you want to delete this widget?')
            }).then(() => {
                this.props.onDelete();
            });
        },
        handleSpindleSpeedChange: (event) => {
            const spindleSpeed = Number(event.target.value) || 0;
            this.setState({ spindleSpeed: spindleSpeed });
        }
    };
    controllerEvents = {
        'serialport:open': (options) => {
            const { port } = options;
            this.setState({ port: port });
        },
        'serialport:close': (options) => {
            const initialState = this.getInitialState();
            this.setState({ ...initialState });
        },
        'workflow:state': (workflowState) => {
            if (this.state.workflowState !== workflowState) {
                this.setState({ workflowState: workflowState });
            }
        },
        'Grbl:state': (state) => {
            const { parserstate } = { ...state };
            const { modal = {} } = { ...parserstate };

            this.setState({
                controller: {
                    type: GRBL,
                    state: state,
                    modal: {
                        spindle: modal.spindle || '',
                        coolant: {
                            mist: get(modal, 'coolant.mist', false),
                            flood: get(modal, 'coolant.flood', false)
                        }
                    }
                }
            });
        },
        'Smoothie:state': (state) => {
            const { parserstate } = { ...state };
            const { modal = {} } = { ...parserstate };

            this.setState({
                controller: {
                    type: SMOOTHIE,
                    state: state,
                    modal: {
                        spindle: modal.spindle || '',
                        coolant: {
                            mist: get(modal, 'coolant.mist', false),
                            flood: get(modal, 'coolant.flood', false)
                        }
                    }
                }
            });
        },
        'TinyG:state': (state) => {
            this.setState({
                controller: {
                    type: TINYG,
                    state: state,
                    modal: { // Not supported yet
                        spindle: '',
                        coolant: {
                            mist: false,
                            flood: false
                        }
                    }
                }
            });
        }
    };

    constructor() {
        super();
        this.state = this.getInitialState();
    }
    componentDidMount() {
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.removeControllerEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    componentDidUpdate(prevProps, prevState) {
        const {
            minimized,
            spindleSpeed
        } = this.state;

        store.set('widgets.spindle.minimized', minimized);
        store.set('widgets.spindle.speed', spindleSpeed);
    }
    getInitialState() {
        return {
            minimized: store.get('widgets.spindle.minimized', false),
            isFullscreen: false,
            canClick: true, // Defaults to true
            port: controller.port,
            controller: {
                type: controller.type,
                state: controller.state,
                modal: {
                    spindle: '',
                    coolant: {
                        mist: false,
                        flood: false
                    }
                }
            },
            workflowState: controller.workflowState,
            spindleSpeed: store.get('widgets.spindle.speed', 1000)
        };
    }
    addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.off(eventName, callback);
        });
    }
    canClick() {
        const { port, workflowState } = this.state;
        const controllerType = this.state.controller.type;
        const controllerState = this.state.controller.state;

        if (!port) {
            return false;
        }
        if (workflowState === WORKFLOW_STATE_RUN) {
            return false;
        }
        if (!includes([GRBL, SMOOTHIE, TINYG], controllerType)) {
            return false;
        }
        if (controllerType === GRBL) {
            const activeState = get(controllerState, 'status.activeState');
            const states = [
                GRBL_ACTIVE_STATE_IDLE,
                GRBL_ACTIVE_STATE_HOLD
            ];
            if (!includes(states, activeState)) {
                return false;
            }
        }
        if (controllerType === SMOOTHIE) {
            const activeState = get(controllerState, 'status.activeState');
            const states = [
                SMOOTHIE_ACTIVE_STATE_IDLE,
                SMOOTHIE_ACTIVE_STATE_HOLD
            ];
            if (!includes(states, activeState)) {
                return false;
            }
        }
        if (controllerType === TINYG) {
            const machineState = get(controllerState, 'sr.machineState');
            const states = [
                TINYG_MACHINE_STATE_READY,
                TINYG_MACHINE_STATE_STOP,
                TINYG_MACHINE_STATE_END,
                TINYG_MACHINE_STATE_HOLD
            ];
            if (!includes(states, machineState)) {
                return false;
            }
        }

        return true;
    }
    render() {
        const { minimized, isFullscreen } = this.state;
        const state = {
            ...this.state,
            canClick: this.canClick()
        };
        const actions = {
            ...this.actions
        };

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header>
                    <Widget.Title>
                        <Widget.Sortable className={this.props.sortable.handleClassName}>
                            <i className="fa fa-bars" />
                            <span className="space" />
                        </Widget.Sortable>
                        {i18n._('Spindle')}
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            title={minimized ? i18n._('Open') : i18n._('Close')}
                            onClick={actions.toggleMinimized}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-chevron-up': !minimized },
                                    { 'fa-chevron-down': minimized }
                                )}
                            />
                        </Widget.Button>
                        <Widget.Button
                            title={i18n._('Fullscreen')}
                            onClick={actions.toggleFullscreen}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-expand': !isFullscreen },
                                    { 'fa-compress': isFullscreen }
                                )}
                            />
                        </Widget.Button>
                        <Widget.Button
                            title={i18n._('Remove')}
                            onClick={actions.deleteWidget}
                        >
                            <i className="fa fa-times" />
                        </Widget.Button>
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    className={classNames(
                        styles['widget-content'],
                        { [styles.hidden]: minimized }
                    )}
                >
                    <Spindle
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
            </Widget>
        );
    }
}

export default SpindleWidget;
