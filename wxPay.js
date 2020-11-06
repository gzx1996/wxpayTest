const rp = require('request-promise');
const crypto = require('crypto');
const xml2js = require('xml2js');
const utils = require('./utils');

/**
 * 
 * @param {*} config 
 * @param {string} config.mch_id  商户号Id
 * @param {string} config.mch_appid appId
 * @param {string} config.mch_secret 商户号secret
 * @param {string} config.notifyUrl 结果回传接受地址
 * @param {string} config.keyPath 商户号key的path
 * @param {string} config.certPath 商户号cert的path
 */
class  WxPay {
  constructor(config) {
    /**
     * 批量设置options
     * @param {object} obj
     */
    this._setOpt = (obj) => {
      Object.assign(this.options, obj);
    }
    /**检查config */
    this._checkConfig = () => {
      let { mch_id, mch_appid, mch_secret, notifyUrl, keyPath, certPath } = this.config;
      if (!mch_id || mch_id.toString().length === 0) throw new Error('config错误，缺少 mch_id');
      if (!mch_appid || mch_appid.toString().length === 0) throw new Error('config错误，缺少 mch_appid');
      if (!mch_secret || mch_secret.toString().length === 0) throw new Error('config错误，缺少 mch_secret');
      if (!notifyUrl || notifyUrl.length === 0) throw new Error('config错误，缺少 notifyUrl');
      if (!keyPath || keyPath.length === 0) throw new Error('config错误，缺少 keyPath');
      if (!certPath || certPath.length === 0) throw new Error('config错误，缺少 certPath');
    }
    /**检查options */
    this._checkOptions = () => {
      let {openId, amount, productDesc, clientIp} = this.options;
      if (!openId || openId.length === 0) throw new Error('options错误，缺少 openId');
      if (!amount || amount === 0) throw new Error('options错误，缺少 amount');
      if (!productDesc || productDesc.length === 0) throw new Error('options错误，缺少 productDesc');
      if (!clientIp || clientIp.length === 0) throw new Error('options错误，缺少 clientIp');
    }
    this._initXmlToSend = () => {
      this._checkConfig();
      this._checkOptions();
      // 构造
      let obj = {
        appid: this.config.mch_appid,
        mch_id: this.config.mch_id 
      }
      obj.nonce_str = utils.noncestr(16),
      obj.out_trade_no = this.config.mch_id + utils.timestampWithRandomNumber();
      obj.device_info = 'miniapp';
      obj.body = this.options.productDesc;
      obj.total_fee = this.options.amount;
      obj.spbill_create_ip = this.options.clientIp;
      obj.notify_url = this.config.notifyUrl;
      obj.trade_type = 'JSAPI';
      obj.openid = this.options.openid;
      // 签名
      let strToSign = utils.jsonToQueryString(obj);
      strToSign += '&key=' + this.config.mch_secret;
      let signedStr = utils.encryptMd5(strToSign);
      obj.sign = signedStr;

      let xml = utils.jsonToXml(obj)
      return [obj, xml];
    }
    this.config = Object.assign({}, config); // 配置，实例化一次之后基本不变的参数
    this.options = {}; // 选项，实时传进来的参数
    this._checkConfig();
  }
  /**
   * 批量设置config
   * @param {object} obj
   */
  setConf(obj) {
    Object.assign(this.config, obj);
  }
  /**
   * 设置config
   * @param {string} k key
   * @param {*} v value
   */
  setConfKV(k, v) {
    this.config[k] = v;
  }
  /**
   * 获取config
   * @param {string} k key
   */
  getConf(k) {
    return k ? this.config[k] : this.config;
  }
  /**
  * 支付
  * @param {*} options 
  * @param {string} options.openId
  * @param {number} amount
  * @param {string} productDesc
  * @param {number} clientIp
  */
  async pay(options, callback) {
    this._setOpt(options);
    let [obj, xml] = this._initXmlToSend();
    let res = await rp({
      method: 'POST',
      uri: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
      headers: {
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(xml)
      },
      body: xml,
      key: fs.readFileSync(this.config.keyPath), //将微信生成的证书放入 config目录下
      cert: fs.readFileSync(this.config.certPath),
      json: false
    });
    const parser = new xml2js.Parser({ trim: true, explicitArray: false, explicitRoot: false });
    res = new Promise(resolve => {
      parser.parseString(res, function (err, result) {
        resolve(result);
      });
    })
    if(res.return_code !== 'SUCCESS'){
      //错误处理
      console.log(res)
    }
    callback(obj) // 回调(存库之类的操作)
    let objToSign = {
      appId: res.appid,
      timeStamp: new Date().getTime() / 1000,
      nonceStr: res.nonce_str,
      package: 'prepay_id=' + res.prepay_id,
      signType:'MD5'
    }
    let strToSign = utils.jsonToQueryString(objToSign);
    strToSign += '&key=' + this.config.mch_secret;
    let signedStr = utils.encryptMd5(strToSign);
    objToSign.paySign = signedStr;
    return objToSign;
  }
}

module.exports = WxPay;