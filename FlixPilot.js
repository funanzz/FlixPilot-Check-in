/* Loon 3.5.1 (983)+ / Quantumult X (934)+ */
'use strict';

const title = 'FlixPilot';
const version = '1.1.0';
const isQX = typeof $task !== 'undefined' && typeof $task.fetch === 'function';
const options = isQX ? qxOptions() : (typeof $argument === 'object' && $argument ? $argument : {});
let signInStatus = '';

async function main() {
  if (options.enabled !== true) return;

  const origin = String(options.instance || '').trim().replace(/\/+$/, '');
  const username = String(options.username || '').trim();
  const password = String(options.password || '');

  // Only send credentials to the HTTPS origin configured in this plugin.
  if (!/^https:\/\/(?:[a-z0-9.-]+|\[[0-9a-f:]+\])(?::[0-9]{1,5})?$/i.test(origin)) {
    throw new Error('请填写 HTTPS 实例根地址，例如 https://example.com');
  }
  if (!username || !password) throw new Error('请填写用户名和密码');

  const day = localDate(new Date());
  const purchaseKey = 'flixpilot.lastPurchaseAttempt:' + JSON.stringify([
    origin.toLowerCase(), username
  ]);

  console.log('FlixPilot ' + version + (isQX ? ' (Quantumult X)' : ' (Loon)'));
  await request(origin, 'post', '/api/auth/login', '登录', { username, password });
  signInStatus = await signIn(origin);
  console.log(signInStatus);
  if (options.autoBuy !== true) return signInStatus;

  if (readLocal(purchaseKey) === day) {
    return signInStatus + '\n今天已提交过自动购买';
  }
  const shop = await request(origin, 'get', '/api/shop', '读取商城');
  if (!Array.isArray(shop.items)) throw new Error('商城返回的商品列表格式不符');

  // Use the same order as the shop's default “全部” view.
  const item = shop.items[0];
  if (!item) return signInStatus + '\n商城暂无商品';
  if (typeof item.id !== 'string' || !item.id || !item.enabled) {
    return signInStatus + '\n商城第一件商品不可购买';
  }
  if (item.totalStock > 0 && item.sold >= item.totalStock) {
    return signInStatus + '\n首件商品已售罄';
  }

  const payment = item.payMethod;
  if (payment !== 'popcorn' && payment !== 'balance') {
    return signInStatus + '\n首件商品的支付方式不受支持';
  }
  const available = shop.wallet && shop.wallet[payment];
  if (!Number.isFinite(available) || !Number.isFinite(item.price) || item.price < 0) {
    throw new Error('无法确认首件商品价格或账户余额');
  }
  const name = String(item.name || '商城首件商品').slice(0, 80);
  if (available < item.price) {
    return signInStatus + '\n' + name + '未兑换，' +
      (payment === 'popcorn' ? '爆米花不足' : '账户余额不足');
  }

  // Record before POST. A timeout can occur after the server deducts the cost.
  if (readLocal(purchaseKey) === day) {
    return signInStatus + '\n今天已提交过自动购买';
  }
  if (!writeLocal(day, purchaseKey)) {
    throw new Error('无法记录本次购买，已跳过');
  }
  let purchase;
  try {
    purchase = await request(origin, 'post', '/api/shop', '购买', { itemId: item.id });
  } catch (error) {
    throw new Error(error.message + '，请到商城订单确认结果');
  }
  const remaining = await popcornLine(origin, '兑换后爆米花余额', purchase.wallet?.popcorn);
  return signInStatus + '\n已兑换「' + name + '」\n' + remaining;
}

function localDate(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
}

async function signIn(origin) {
  const current = await request(origin, 'get', '/api/auth/me', '读取账号签到状态');
  if (!current.user || typeof current.user !== 'object') {
    throw new Error('登录后未能读取账号，检查登录会话是否有效');
  }
  if (signedToday(current.user)) {
    return signInSummary(origin, '今天已签到', current.user.signInStreak, current.user.popcorn);
  }

  let failure;
  try {
    const result = await request(origin, 'post', '/api/auth/sign-in', '签到', undefined, true);
    if (result.success === true) {
      return signInSummary(origin, '签到成功', result.streak, result.popcorn);
    }
    if (String(result.message || '').trim() === '今天已签到') {
      return signInSummary(origin, '今天已签到', result.streak, result.popcorn);
    }
    const detail = safeSiteMessage(result.message || result.error);
    failure = result.disabled === true ? '站点已关闭签到' : '站点未确认签到成功';
    if (detail) failure += '：' + detail;
  } catch (error) {
    failure = error.message;
  }

  // A response can be ambiguous even if the server recorded the sign-in.
  let verified;
  try {
    verified = await request(origin, 'get', '/api/auth/me', '复查签到状态');
  } catch (error) {
    console.log(error.message);
  }
  if (verified && signedToday(verified.user)) {
    return signInSummary(origin, '已核实今天签到完成', verified.user.signInStreak, verified.user.popcorn);
  }
  throw new Error(failure);
}

function signedToday(user) {
  if (!user || typeof user.lastSignIn !== 'string' || !user.lastSignIn) return false;
  const timestamp = Date.parse(user.lastSignIn);
  // The FlixPilot dashboard compares calendar dates in Asia/Shanghai.
  const offset = 8 * 60 * 60 * 1000;
  const date = time => Math.floor((time + offset) / 86400000);
  return Number.isFinite(timestamp) && date(timestamp) === date(Date.now());
}

async function signInSummary(origin, status, streak, popcorn) {
  const summary = Number.isFinite(streak) ? status + '，连续 ' + streak + ' 天' : status;
  const balance = await popcornLine(origin, '当前爆米花余额', popcorn);
  return summary + '\n' + balance;
}

async function popcornLine(origin, label, popcorn) {
  if (!Number.isFinite(popcorn)) {
    try {
      const account = await request(origin, 'get', '/api/auth/me', '查询爆米花余额');
      popcorn = account.user?.popcorn;
    } catch (error) {
      console.log(error.message);
    }
  }
  return label + '：' + (Number.isFinite(popcorn) ? popcorn : '暂未获取');
}

function safeSiteMessage(value) {
  if (typeof value !== 'string') return '';
  // Site messages may be displayed in the log. Never copy session or login fields.
  let text = value;
  for (const secret of [options.username, options.password]) {
    if (secret) text = text.split(String(secret)).join('[已隐藏]');
  }
  return text.replace(/https?:\/\/\S+|[a-z0-9_=.+/@:%-]{12,}/gi, '[已隐藏]')
    .replace(/\s+/g, ' ').trim().slice(0, 140);
}

function qxOptions() {
  const args = (typeof $environment === 'object' && $environment?.variables) || {};
  return {
    enabled: true,
    instance: args.instance,
    username: args.username,
    password: args.password,
    autoBuy: args.autoBuy === 'true'
  };
}

function readLocal(key) {
  return isQX ? $prefs.valueForKey(key) : $persistentStore.read(key);
}

function writeLocal(value, key) {
  if (!isQX) return $persistentStore.write(value, key) === true;
  $prefs.setValueForKey(value, key);
  return readLocal(key) === value;
}

function notify(subtitle, message) {
  if (isQX) $notify(title, subtitle, message);
  else $notification.post(title, subtitle, message);
}

async function sendRequest(method, settings) {
  if (isQX) {
    const response = await $task.fetch({
      ...settings,
      method: method.toUpperCase(),
      opts: { 'auto-cookie': true, redirection: false, 'skip-cert-verify': false }
    });
    return { status: response.statusCode, data: response.body };
  }

  return new Promise((resolve, reject) => {
    $httpClient[method]({
      ...settings,
      'auto-cookie': true,
      'auto-redirect': false,
      insecure: false
    }, (error, response, data) => {
      if (error || !response) reject(new Error('HTTP request failed'));
      else resolve({ status: response.status, data });
    });
  });
}

async function request(origin, method, path, action, payload, allowBusinessFailure = false) {
  const settings = {
    url: origin + path,
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
  };
  if (payload !== undefined) {
    settings.headers['Content-Type'] = 'application/json';
    settings.body = JSON.stringify(payload);
  }

  let response;
  try {
    response = await sendRequest(method, settings);
  } catch (_) {
    throw new Error(action + '请求失败，请检查网络或实例地址');
  }

  const status = Number(response.status);
  if (!Number.isFinite(status) || status < 200 || status >= 300) {
    throw new Error(action + '失败（HTTP ' + status + '）');
  }

  let result;
  try {
    result = JSON.parse(response.data);
  } catch (_) {
    throw new Error(action + '响应格式不符');
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error(action + '响应格式不符');
  }
  if (!allowBusinessFailure && (result.error || result.success === false)) {
    throw new Error('站点拒绝' + action);
  }
  return result;
}

main()
  .then(message => {
    if (message) notify('每日任务', message);
  }, error => {
    const message = signInStatus ? signInStatus + '\n' + error.message : error.message;
    console.log(message);
    notify('任务未完成', message);
  })
  .finally(() => $done());
