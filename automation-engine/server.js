const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined'));

// In-memory storage (persist in real app: DB)
let rules = [];
let alerts = [];

function triggerAction(rule, payload){
  // Only support a single action type for now: sendAlert
  if(rule.action && rule.action.type === 'sendAlert'){
    const alert = {
      id: `${rule.id}-alert-${Date.now()}`,
      ruleId: rule.id,
      message: rule.action.message,
      at: new Date().toISOString(),
      payload: payload
    };
    alerts.push(alert);
    console.log('ALERT TRIGGERED:', alert);
  }
}

function evaluateRule(rule, payload){
  if(!rule || !payload) return;
  const t = rule.trigger || {};
  // timing trigger format: { type: 'timing', blockId: 'block1', timeLeft: 30 }
  if(t.type === 'timing'){
    if(t.blockId === payload.blockId && typeof payload.timeLeft === 'number'){
      // trigger when timeLeft <= configured threshold
      if(payload.timeLeft <= t.timeLeft){
        triggerAction(rule, payload);
      }
    }
  }
}

// CRUD-ish endpoints
app.get('/rules', (req, res) => {
  res.json(rules);
});

app.post('/rules', (req, res) => {
  const data = req.body || {};
  if(!data.name || !data.trigger || !data.action){
    return res.status(400).json({error: 'Missing fields: name, trigger, action'});
  }
  const rule = {
    id: `r_${Date.now()}`,
    name: data.name,
    trigger: data.trigger,
    action: data.action
  };
  rules.push(rule);
  res.status(201).json(rule);
});

// Simulate an event coming from Escaleta engine
app.post('/simulate', (req, res) => {
  const payload = req.body || {};
  if(!payload.blockId){
    return res.status(400).json({error: 'payload.blockId required'});
  }
  if(typeof payload.timeLeft !== 'number'){
    payload.timeLeft = 0;
  }
  // evaluate all rules
  rules.forEach(r => evaluateRule(r, payload));
  res.json({status: 'ok', evaluated: rules.length});
});

app.get('/alerts', (req, res) => {
  res.json(alerts);
});

const server = app.listen(port, () => {
  console.log(`Automation Engine listening at http://localhost:${port}`);
});

process.on('SIGINT', () => server.close());
