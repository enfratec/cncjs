/* eslint react/jsx-no-bind: 0 */
import moment from 'moment';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Anchor from '../../../components/Anchor';
import Table, { Toolbar } from '../../../components/Table';
import ToggleSwitch from '../../../components/ToggleSwitch';
import { TablePagination } from '../../../components/Paginations';
import confirm from '../../../lib/confirm';
import i18n from '../../../lib/i18n';
import {
    MODAL_CREATE_RECORD,
    MODAL_UPDATE_RECORD
} from './constants';

class TableRecords extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state, actions } = this.props;

        return (
            <Table
                style={{
                    borderBottom: state.records.length > 0 ? '1px solid #ddd' : 'none'
                }}
                border={false}
                data={(state.api.err || state.api.fetching) ? [] : state.records}
                rowKey={(record) => {
                    return record.id;
                }}
                emptyText={() => {
                    if (state.api.err) {
                        return (
                            <span className="text-danger">
                                {i18n._('An unexpected error has occurred.')}
                            </span>
                        );
                    }

                    if (state.api.fetching) {
                        return (
                            <span>
                                <i className="fa fa-fw fa-spin fa-circle-o-notch" />
                                <span className="space" />
                                {i18n._('Loading...')}
                            </span>
                        );
                    }

                    return i18n._('No data to display');
                }}
                title={() =>
                    <Toolbar>
                        <button
                            type="button"
                            className="btn btn-default"
                            onClick={() => {
                                actions.openModal(MODAL_CREATE_RECORD);
                            }}
                        >
                            <i className="fa fa-plus" />
                            <span className="space" />
                            {i18n._('New')}
                        </button>
                        <div style={{ position: 'absolute', right: 0, top: 0 }}>
                            <TablePagination
                                page={state.pagination.page}
                                pageLength={state.pagination.pageLength}
                                totalRecords={state.pagination.totalRecords}
                                onPageChange={({ page, pageLength }) => {
                                    actions.fetchRecords({ page, pageLength });
                                }}
                                prevPageRenderer={() => <i className="fa fa-angle-left" />}
                                nextPageRenderer={() => <i className="fa fa-angle-right" />}
                            />
                        </div>
                    </Toolbar>
                }
                columns={[
                    {
                        title: i18n._('Enabled'),
                        key: 'enabled',
                        width: '1%',
                        render: (value, row, index) => {
                            const { id, enabled } = row;
                            const title = enabled ? i18n._('Enabled') : i18n._('Disabled');

                            return (
                                <ToggleSwitch
                                    checked={enabled}
                                    size="sm"
                                    title={title}
                                    onChange={(event) => {
                                        actions.updateRecord(id, { enabled: !enabled });
                                    }}
                                />
                            );
                        }
                    },
                    {
                        title: i18n._('Name'),
                        key: 'name',
                        render: (value, row, index) => {
                            const { name } = row;

                            return (
                                <Anchor
                                    onClick={(event) => {
                                        actions.openModal(MODAL_UPDATE_RECORD, row);
                                    }}
                                >
                                    {name}
                                </Anchor>
                            );
                        }
                    },
                    {
                        title: i18n._('Date Modified'),
                        className: 'text-nowrap',
                        key: 'date-modified',
                        width: '1%',
                        render: (value, row, index) => {
                            const { mtime } = row;
                            if (mtime) {
                                return moment(mtime).format('lll');
                            }

                            return '–';
                        }
                    },
                    {
                        title: i18n._('Action'),
                        className: 'text-nowrap',
                        key: 'action',
                        width: '1%',
                        render: (value, row, index) => {
                            const { id } = row;

                            return (
                                <div>
                                    <button
                                        type="button"
                                        className="btn btn-xs btn-default"
                                        title={i18n._('Edit Account')}
                                        onClick={(event) => {
                                            actions.openModal(MODAL_UPDATE_RECORD, row);
                                        }}
                                    >
                                        <i className="fa fa-fw fa-edit" />
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-xs btn-default"
                                        title={i18n._('Delete Account')}
                                        onClick={(event) => {
                                            confirm({
                                                title: (
                                                    <div>
                                                        {i18n._('My Account')}
                                                        <span className="space" />
                                                        &rsaquo;
                                                        <span className="space" />
                                                        {i18n._('Delete')}
                                                    </div>
                                                ),
                                                body: i18n._('Are you sure you want to delete the account?')
                                            }).then(() => {
                                                actions.deleteRecord(id);
                                            });
                                        }}
                                    >
                                        <i className="fa fa-fw fa-trash" />
                                    </button>
                                </div>
                            );
                        }
                    }
                ]}
            />
        );
    }
}

export default TableRecords;
