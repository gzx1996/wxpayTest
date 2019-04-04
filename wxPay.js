const axios = require('axios')
const crypto = require('crypto')
const xml2js = require('xml2js');

const config = {
    appId: 'appId', //APPId
    mch_id: 'mchId', //商户号
    mch_secret: "mch_secret", //商户secret
    callback: 'localhost:8080', //付款结果的回调地址
    trade_type: 'JSAPI' //小程序取值如下：JSAPI
}

const createNonceStr = () => {
    return Math.random().toString(36).substr(2, 15);
};

const createTimeStamp = () => {
    return parseInt(new Date().getTime() / 1000) + '';
};

const createOutTradeNo = () => {
    let now = new Date();
    let date_time = now.getFullYear() + '' + (now.getMonth() + 1) + '' + now.getDate(); //年月日
    let date_no = (now.getTime() + '').substr(-8); //生成8位为日期数据，精确到毫秒
    let random_no = Math.floor(Math.random() * 99);
    if (random_no < 10) { //生成位数为2的随机码
        random_no = '0' + random_no;
    }
    let out_trade_no = config.mch_id + date_time + date_no + random_no; //商户订单号，需保持唯一性
    return out_trade_no
};

const createSign = (obj) => {
    let str = urlUnite(objSort(obj))
    let stringSignTemp = str + '&key=' + config.mch_secret
    let signStr = crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase()
    return signStr
};

const fnCreateXml = function (obj) {
    let _xml = '';
    for (let key in obj) {
        _xml += '<' + key + '>' + obj[key] + '</' + key + '>';
    }
    return _xml;
};
const urlUnite = function (o, p, ec) {
    var url = []
    if (typeof o == 'object') {
        for (var i in o) {
            var key = i
            if (p) key = p + '[' + i + ']'
            if (typeof o[i] == 'object') {
                url.push(urlUnite(o[i], key))
            } else {
                url.push(key + '=' + o[i])
            }
        }
    }
    return url.join('&')
}
const objSort = (obj, desc) => {
    var sdic = Object.keys(obj).sort()
    var o = {}
    for (ki in sdic) {
        o[sdic[ki]] = obj[sdic[ki]]
    }
    return obj = o
}

const signAgain = (obj)=>{
    let str = urlUnite(objSort(obj))
    let stringSignTemp = str + '&key=' + config.mch_secret
    let signStr = crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase()
    return signStr

}

const initSendData = (productDesc, amount, Aip, openId, deviceInfo='miniapp') => {
    let obj = {
        appid: config.appId,
        mch_id: config.mch_id,
    }
    let nonce_str = createNonceStr();
    obj.nonce_str = nonce_str;

    let out_trade_no = createOutTradeNo()
    obj.out_trade_no = out_trade_no

    obj.device_info = deviceInfo, //设备类型
    obj.body = productDesc, //商品名称
    obj.total_fee = amount / 100 //金额，单位：分
    obj.spbill_create_ip = Aip //用户IP
    obj.notify_url = config.callback//付款结果的回调地址
    obj.trade_type = config.trade_type //小程序取值如下：JSAPI
    obj.openid = openId //用户openId

    obj.sign = createSign(obj)

    let xmlData = fnCreateXml(obj);
    let sendData = '<xml>' + xmlData + '</xml>';
    return {obj,sendData};
};

const main = async (productDesc, amount, Aip, openId, successCallBack=(res)=>{}) =>{
    let url = 'https://api.mch.weixin.qq.com/pay/unifiedorder'
    let {obj,sendData} = initSendData(productDesc, amount, Aip, openId)
    let r = await axios.post(url,{
        data:sendData
    })
    let parser = new xml2js.Parser({trim: true, explicitArray: false, explicitRoot: false});//解析签名结果xml转json
    let res = await new Promise((resolve,reject)=>{
        parser.parseString(r.data, function (err, result) {
            resolve(result)
        });
    })
   if(res.return_code !== 'SUCCESS'){
       //错误处理
       console.log(res)
   }
   console.log(res)
   //生成预订单成功，存入表
   successCallBack(obj)
   
   let objToSign = {
        appId: res.appid,
        timeStamp: createTimeStamp(),
        nonceStr: res.nonce_str,
        package: 'prepay_id=' + res.prepay_id,
        signType:'MD5'
   }
   let paySign = signAgain(objToSign)

   let json = Object.assign(objToSign,{paySign:paySign})
   console.log(json)
   return json
}
main('测试测试测试测试',100,'192.168.1.1','openId')

module.exports = main
