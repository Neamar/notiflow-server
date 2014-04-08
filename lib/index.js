'use strict';

var connectFlowdock = require('./listener');

connectFlowdock(process.env.FLOWDOCK_TOKEN, process.env.GCM_TOKEN, 'boostinlyon/notiflow');
