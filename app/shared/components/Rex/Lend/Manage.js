// @flow
import React, { PureComponent } from 'react';
import { translate } from 'react-i18next';
import { get } from 'dot-prop-immutable';
import {
  Button,
  Container,
  Dropdown,
  Form,
  Message,
  Segment,
  Header,
} from 'semantic-ui-react';
import GlobalFormFieldToken from '../../Global/Form/Field/Token';
import GlobalFormMessageError from '../../Global/Form/Message/Error';
import GlobalTransactionModal from '../../Global/Transaction/Modal';

class RexLendManage extends PureComponent<Props> {
  state = {
    confirming: false,
    transactionType: 'buy'
  };
  componentDidMount() {
    const { actions, settings } = this.props;

    actions.clearSystemState();

    actions.getTableByBounds('eosio', 'eosio', 'rexbal', settings.account, settings.account);
    actions.getTableByBounds('eosio', 'eosio', 'rexfund', settings.account, settings.account);
  }
  confirmTransaction = () => {
    const { actions } = this.props;
    const { amountToBuy, amountToSell, transactionType } = this.state;

    if (transactionType === 'buy') {
      actions.buyrex(amountToBuy);
    } else {
      actions.sellrex(amountToSell);
    }
  };
  handleChange = (e, { name, value, valid }) => {
    this.setState({ error: null }, () => {
      if (valid) {
        this.setState({ [name]: value });
      } else {
        return this.setState({ error: 'invalid_amount' });
      }

      if (name === 'transactionType') {
        this.setState({ amountToBuy: null, amountToSell: null });
      }

      const { tables, settings } = this.props;

      const rexBalance = get(tables, `eosio.eosio.rexbal.${settings.account}.rows.0.matured_rex`, '0.0000 REX');
      const fundedBalance = get(tables, `eosio.eosio.rexfund.${settings.account}.rows.0.balance`, '0.0000 EOS');

      let notEnoughBalance = false;

      if (name === 'amountToBuy') {
        notEnoughBalance =
          Number((fundedBalance || '').split(' ')[0]) <
          Number(value.split(' ')[0]);
      } else if (name === 'amountToSell') {
        notEnoughBalance =
          Number((rexBalance || '').split(' ')[0]) <
          Number(value.split(' ')[0]);
      }

      if (notEnoughBalance) {
        this.setState({ error: 'insufficient_balance_matured' });
      }
    });
  };
  onClose = () => {
    this.setState({
      confirming: false,
      amountToBuy: undefined,
      amountToSell: undefined,
    });
  }
  render() {
    const {
      actions,
      blockExplorers,
      connection,
      settings,
      system,
      tables,
      t
    } = this.props;
    const {
      amountToBuy,
      amountToSell,
      confirming,
      error,
      transactionType
    } = this.state;

    const priceOfRex = 0.001;

    const dropdownOptions = ['buy', 'sell'].map((transactionType) => (
      {
        key: transactionType,
        text: t(`rex_interface_manage_rex_options_${transactionType}`),
        value: transactionType
      }
    ));

    let transaction;
    let contract;

    const actionName = transactionType === 'buy' ? 'BUYREX' : 'SELLREX';

    if (system && system[`${actionName}_LAST_TRANSACTION`]) {
      transaction = system[`${actionName}_LAST_TRANSACTION`];
    }
    if (system && system[`${actionName}_LAST_CONTRACT`]) {
      contract = system[`${actionName}_LAST_CONTRACT`];
    }

    const saveDisabled = error ||
      (!amountToBuy && transactionType === 'buy') ||
      (!amountToSell && transactionType === 'sell');
    const displaySuccessMessage = !saveDisabled;

    if (!tables.eosio || !tables.eosio.eosio) return false;

    const maturedRex = get(tables, `eosio.eosio.rexbal.${settings.account}.rows.0.matured_rex`, '0.0000 REX');
    const rexBalance = get(tables, `eosio.eosio.rexbal.${settings.account}.rows.0.rex_balance`, '0.0000 REX');
    const fundedBalance = get(tables, `eosio.eosio.rexfund.${settings.account}.rows.0.balance`, '0.0000 EOS');

    const confirmationPage = confirming ? (
      <GlobalTransactionModal
        actionName={transactionType === 'buy' ? 'BUYREX' : 'SELLREX'}
        actions={actions}
        blockExplorers={blockExplorers}
        content={(
          <React.Fragment>
            { transactionType === 'buy' ? (
              <p>
                {t('rex_interface_manage_rex_confirmation_modal_buy_rex', {
                  amountToBuy,
                  rexAmount: (amountToBuy.split(' ')[0] / priceOfRex)
                })}
              </p>
            ) : (
              <p>
                {t('rex_interface_manage_rex_confirmation_modal_sell_rex', {
                  amountToSell,
                  rexAmount: (amountToSell.split(' ')[0] / priceOfRex)
                })}
              </p>
            )}
            <Container>
              <Button
                color="green"
                content={t('common:confirm')}
                disabled={system.BUY_REX || system.SELL_REX}
                floated="right"
                onClick={this.confirmTransaction}
                textAlign="right"
              />
              <Button
                content={t('common:cancel')}
                onClick={() => this.setState({
                  amountToBuy: undefined,
                  amountToSell: undefined,
                  confirming: false,
                })}
                textAlign="left"
              />
            </Container>
          </React.Fragment>
        )}
        contract={contract}
        onClose={this.onClose}
        onSubmit={this.onSubmit}
        open
        settings={settings}
        system={system}
        title={t('rex_interface_manage_rex_confirmation_modal_header')}
        transaction={transaction}
      />
    ) : false;

    return (
      <React.Fragment>
        <Header>
          {t('rex_interface_manage_rex_header', { chainSymbol: connection.chainSymbol })}
          <Header.Subheader>
            {t('rex_interface_manage_rex_subheader', { chainSymbol: connection.chainSymbol })}
          </Header.Subheader>
        </Header>
        {confirming ? confirmationPage : (
          <React.Fragment>
            <Message>
              <p>
                {
                  t(
                    'rex_interface_rent_funding_balance',
                    {
                      fundedBalance: Number(parseFloat(fundedBalance) || 0).toFixed(4),
                      chainSymbol: connection.chainSymbol
                    }
                  )
                }
              </p>
              <p>
                {t('rex_interface_rent_rex_balance', { rexBalance: Number(parseFloat(rexBalance) || 0).toFixed(4) })}
              </p>
              <p>
                {t('rex_interface_rent_rex_balance_mature', { rexBalance: Number(parseFloat(maturedRex) || 0).toFixed(4) })}
              </p>
            </Message>
            <Form success={displaySuccessMessage}>
              <Form.Group widths="equal">
                <label>
                  <strong>{t('rex_interface_transaction_type_label')}</strong>
                  <br />
                  <Dropdown
                    autoFocus
                    defaultValue="buy"
                    name="transactionType"
                    onChange={(e, props) => this.handleChange(e, { ...props, valid: true })}
                    options={dropdownOptions}
                    selection
                    style={{ marginTop: '4px' }}
                  />
                </label>

                {transactionType === 'buy' ? (
                  <GlobalFormFieldToken
                    connection={connection}
                    key="amountToBuy"
                    label={t('rex_interface_manage_rex_buy', { chainSymbol: connection.chainSymbol })}
                    name="amountToBuy"
                    onChange={this.handleChange}
                  />
                ) : (
                  <GlobalFormFieldToken
                    connection={connection}
                    key="amountToSell"
                    label={t('rex_interface_manage_rex_sell', { chainSymbol: connection.chainSymbol })}
                    name="amountToSell"
                    onChange={this.handleChange}
                    symbol="REX"
                  />
                )}
              </Form.Group>
              { displaySuccessMessage && transactionType === 'buy' && amountToBuy && (
                <Message success>
                  {t(
                    'rex_interface_manage_rex_amount_to_buy',
                    {
                      amount: amountToBuy,
                      rexAmount: amountToBuy.split(' ')[0] / priceOfRex
                    }
                  )}
                </Message>
              )}
              { displaySuccessMessage && transactionType === 'sell' && amountToSell && (
                <Message success>
                  {t(
                    'rex_interface_manage_rex_amount_to_sell',
                    {
                      amount: amountToSell,
                      rexAmount: amountToSell.split(' ')[0] / priceOfRex
                    }
                  )}
                </Message>
              )}
              {error && (
                <GlobalFormMessageError
                  error={error}
                  style={{ marginTop: '20px', marginBottom: '20px' }}
                />
              )}
              <Button
                content={transactionType === 'buy' ? t('rex_interface_manage_rex_buy_button') : t('rex_interface_manage_rex_sell_button')}
                disabled={saveDisabled}
                primary
                onClick={() => this.setState({ confirming: true })}
              />
            </Form>
          </React.Fragment>
        )}
      </React.Fragment>
    );
  }
}

export default translate('rex')(RexLendManage);
