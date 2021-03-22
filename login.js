/**
 * @description  登录模块，跟登录相关的工具都有
 * @module utils/login
*/

import { localStorage } from './storage'
import { isCCtalkApp, enterpriseAdaptor, isEnterprise, isChargeCompany, isAndroid } from './device-utils'
import { asyncScript } from './url-utils'
import { jsonp } from './fetch'
import { PASS_SDK_URL } from './../constants/url'
const { BUILD_ENV_HOST, NODE_ENV, BUILD_ENV } = process.env

const storage = localStorage('login_reload')
let isInitQuickPass = false
let reloaded = false

// 参数装换
function paramsToString(url = location.href, options = {}) {
  // let params = [encodeURIComponent(url)]
  let params = [url]
  for (let key in options) {
    params.push(`${key}=${options[key]}`)
  }
  params = params.join('&')
  return params
}


function registerLoginReload() {
  storage.set('login_reload', 1)

  window.addEventListener('pageshow', (e) => {
    setTimeout(() => {
      const reloadFlag = storage.get('login_reload')

      if (reloadFlag && e.persisted && !reloaded) {
        reloaded = true
        storage.remove('login_reload')
        window.location.reload()
      }
    }, 20)
  })
}

const getYzPrefix = () => window.GDATA.isYz ? 'yz' : ''

export const getPassHost = (env) => {
  if (env === 'qa' || (BUILD_ENV_HOST && BUILD_ENV_HOST !== 'prod') || (BUILD_ENV && BUILD_ENV !== 'release') || NODE_ENV === 'development') { // 兼容不同站点env变量
    return `${window.location.protocol || 'http:'}//qapass.cctalk.com/`
  }

  return `https://${getYzPrefix()}pass.cctalk.com/`
}

const getPassHosPre = (env) => {
  if (env === 'qa' || (BUILD_ENV_HOST && BUILD_ENV_HOST !== 'prod') || (BUILD_ENV && BUILD_ENV !== 'release') || NODE_ENV === 'development') { // 兼容不同站点env变量
    return `//qapass`
  }

  return `//${getYzPrefix()}pass`
}

const getBIReg = () => {
  // 从BI SDK 获取注册来源
  return (window.ht && window.ht.getRegQuerystring && window.ht.getRegQuerystring()) || ''
}

/**
 * 获取登录地址<br />
 * 学校版登录地址规则 http://pass.cctalk.com/school?url=返回地址&business_domain=yyy_cctob&bireg=BISdk获取的来源，BI注册来源的获取方法参照 getBIReg 方法
 *
 * @param {object} config 配置参数
 * @param {string} config.env 参数对应的环境
 * @returns {string} 对应的登录地址
 */
export function getLoginUrl(config = {}) { // 为了兼容不同框架内的环境变量不一致的问题，这里可以强制指定环境
  let host = getPassHost(config.env) 

  return isChargeCompany || !isEnterprise
    ? `${host}login/?${config.quickReg ? 'quickreg=1&' : ''}url=`
    : `${host}school/?business_domain=yyy_cctob&bireg=${getBIReg()}&url=`
}

/**
 * 获取登出地址 <br />
 *
 * @param {object} config 配置参数
 * @param {string} config.env 参数对应的环境
 * @returns {string} 对应的登出地址
 */
export function getLogoutUrl(config = {}) {
  let host = getPassHost(config.env)
  return `${host}logout/?url=` // 登出地址平台版和企业版共用一套
}

/**
 * 获取注册地址 <br />
 * 目前注册和登录是一套地址，所以可以理解为登录和注册用的是一套页面
 *
 * @param {object} config 配置参数
 * @param {string} config.env 参数对应的环境
 * @returns {string} 对应的注册页面地址
 */
export function getRegisterUrl(config = {}) {
  let host = getPassHost(config.env)

  return isChargeCompany || !isEnterprise
    ? `${host}signup?url=`
    : `${host}school/?business_domain=yyy_cctob&bireg=${getBIReg()}&url=`
}

/**
 * 获取切换用户地址（退出并登录）<br />
 * 退出后不自动登录，用户可以再次手动登录
 *
 * @param {object} config 配置参数
 * @param {string} config.env 参数对应的环境
 * @returns {string} 对应的切换用户地址
 */
export function getSwitchUserUrl(config = {}) {
  let host = getPassHost(config.env)

  return isChargeCompany || !isEnterprise
    ? `${host}?autologin=false&url=`
    : `${host}school/?autologin=false&business_domain=yyy_cctob&bireg=${getBIReg()}&url=`
}

/**
 * 登录方法 <br />
 * 会判断设备，根据对应设备调用对应的登录方法
 *
 * @param {string} url 登录结束后的回跳地址，默认为 `location.href`
 * @param {object} options 参数和配置。如果是跳转登录的，参数会拼接到登录地址上
 * @returns {void}
 */
export function login(url = location.href, options = {}) {
  let { extraInfo = {} } = window.GDATA || {}

  if (isCCtalkApp()) {
    HJSDK.invoke('service_login')

    if (extraInfo.clubAuthExpired) { // 兼容app登录态还有效，但是web的clubauth失效的情况
      isAndroid()
        ? HJSDK.invoke('ui_alert', { message: '您的登录状态已过期，请退出App后再试', buttonTitle: '确定'})
        : alert('您的登录状态已过期，请重新登录后再试')
    }

    return
  }
  registerLoginReload()
  let paramsStr = paramsToString(url, options)

  let urlLong = `${getLoginUrl(options)}${encodeURIComponent(paramsStr)}`

  // 191127记录，pass微信登录会多跳一次v2的链接，需要与pass沟通改掉

  if (options.replace) {
    window.location.replace(urlLong)
  } else {
    window.location.href = urlLong
  }

  return true
}

/**
 * 登出方法 <br />
 *
 * App 内无法调用该方法登出
 *
 * @param {string} url 成功退出登录后的回跳地址，默认为 `location.href`
 * @param {object} options 参数和配置。参数会拼接到登出地址上
 * @returns {void}
 */
export function logout(url = location.href, options = {}) {
  if (isCCtalkApp()) return

  let paramsStr = paramsToString(url, options)

  window.location.href = `${getLogoutUrl()}${encodeURIComponent(paramsStr)}`
  return true
}

/**
 * 跳转至注册页面
 * App 内无法调用该方法登出
 *
 * @param {string} url 注册成功后的回跳地址，默认为 `location.href`
 * @param {object} options 参数和配置。参数会拼接到注册地址上
 * @returns {void}
 */
export function register(url = location.href, options = {}) {
  if (isCCtalkApp()) return

  let paramsStr = paramsToString(url, options)

  window.location.href = `${getRegisterUrl()}${encodeURIComponent(paramsStr)}`
  return true
}


/**
 * 切换账号<br />
 * 先调用pass接口退出登录，再进行账号切换（本质是重新登录）
 *
 * @param {string} url 成功切换用户后的回跳地址，默认为 `location.href`
 * @param {object} options 参数和配置。参数会拼接到地址上
 * @returns {void}
 */
export function switchUser(url = location.href, options = {}) {
  let host = getPassHost(options.env)

  let paramsStr = paramsToString(url, options)

  registerLoginReload()

  let logoutAndSwitchUrl = getLogoutUrl() + encodeURIComponent(`${getSwitchUserUrl()}${encodeURIComponent(paramsStr)}`)

  let loginTimer = setTimeout(() => {
    window.location.href = logoutAndSwitchUrl
  }, 1000)

  jsonp(`${host}handler/ucenter?action=logout`, {}, (err, data) => {
    clearTimeout(loginTimer)
    if (err) {
      window.location.href = logoutAndSwitchUrl
      return true
    }
    window.location.href = `${getSwitchUserUrl()}${encodeURIComponent(paramsStr)}`
  })

  return true
}


/**
 * 异步加载快速登录的脚本<br />
 * PC端的快速登录是弹窗模式的，因为大部分情况不需要进来就初始化，所以快速登录组件我们通过异步方式加载pass的初始化脚本
 * @return {void} 直接将脚本插入到页面中，并初始化
 */
export function loadPassScriptPC() {
  // 当发现 window.HJPassport时，就设置好
  if (window.HJPassport) return

  let loaderPass = asyncScript({
    src: PASS_SDK_URL,
    opts: { async: true }
  })

  loaderPass.then(() => {
    initLoopPassSdkPC()
  }).catch((e) => {
    console.log(e)
  })
}

// 内部循环调用，目标是等待window.HJPassport出现
function  initLoopPassSdkPC() {
  let timer = null
  let counter = 0

  clearInterval(timer)
  initQuickLogin()

  timer = setInterval(() => {
    if (window.HJPassport) {
      initQuickLogin()

      clearInterval(timer)

    } else if (counter >= 10) {
      clearInterval(timer)
    } else {
      counter++
    }
  }, 1000)
}

function initQuickLogin() {
  window.HJPassport && window.HJPassport.init({
    API_SLD: getPassHosPre(),  // 配置接口host的头 （0.1.2接入）
    source: 'cctalk',
    userDomain: 'cc'
  })
}

/**
 * 调用PC网页版快速登录<br />
 * 校园版会自动跳转，而不是走弹窗模式
 * @param {string} url 登录成功后的回跳地址（弹窗模式不支持）
 * @return {void}
 */
export function quickLoginPC(url) {
  if (isEnterprise) { // 学校版不需要快速登录
    login(url)
  }
  if (window.HJPassport !== undefined) {
    window.HJPassport.show('login')
  } else {
    initQuickLogin()
    window.HJPassport ? window.HJPassport.show('login') : login() // 如果快速登录初始化失败，则直接跳转至登录页
  }
}

/**
 * 调用PC网页版快速注册<br />
 * 校园版会自动跳转，而不是走弹窗模式
 * @param {string} url 注册成功后的回跳地址（弹窗模式不支持）
 * @return {void}
 */
export function quickRegisterPC() {
  if (isEnterprise) {
    register()
  }

  if (window.HJPassport !== undefined) {
    window.HJPassport.show('register')
  } else {
    initQuickLogin()
    window.HJPassport ? window.HJPassport.show('register') : register() // 如果快速登录初始化失败，则直接跳转注册页
  }
}