const { Machine, assign, actions } = require('xstate');
const dialog = require('./util/dialog.js');
const messages = require('./messages/home-isolation');

const chatStateMachine = Machine({
  id: 'chatMachine',
  initial: 'selectLanguage',
  on: {
    USER_RESET: {
      target: '#selectLanguage',
      // actions: assign( (context, event) => dialog.sendMessage(context, dialog.get_message(messages.reset, context.user.locale), false))
    }
  },
  states: {
    selectLanguage: {
      id: 'selectLanguage',
      initial: 'prompt',
      states: {
        prompt: {
          onEntry: assign((context, event) => {
            let message = dialog.get_message(messages.selectLanguage.prompt.preamble, context.user.locale);
            let { prompt, grammer } = dialog.constructListPromptAndGrammer(messages.selectLanguage.prompt.options.list, messages.selectLanguage.prompt.options.messageBundle, context.user.locale);
            context.grammer = grammer;
            message += prompt;
            dialog.sendMessage(context, message);
          }),
          on: {
            USER_MESSAGE: 'process'
          }
        },
        process: {
          onEntry: assign((context, event) => {
            context.intention = dialog.get_intention(context.grammer, event, true);
          }),
          always: [
            {
              cond: (context) => context.intention == dialog.INTENTION_UNKOWN,
              target: 'error'
            },
            {
              actions: assign((context, event) => {
                context.user.locale = context.intention;
              }),
              target: '#menu'
            }
          ]
        },
        error: {
          onEntry: assign((context, event) => {
            dialog.sendMessage(context, dialog.get_message(dialog.global_messages.error.optionsRetry, context.user.locale), false);
          }),
          always: 'prompt'
        }
      }
    }, // selectLanguage
  }
});

module.exports = chatStateMachine;