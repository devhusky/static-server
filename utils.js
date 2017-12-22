// 解析断点数据区间
exports.parseRange = function(str, size) {
  // 暂不支持多区间 遇到多区间情况 则报416错误
  if (str.indexOf(',') != -1) {
    return
  }
  const range = str.split('-')
  var start = parseInt(range[0], 10)
  var end = parseInt(range[1], 10)

  // 判断无效情况
  if ((isNaN(start) && isNaN(end)) || start > end || end > size) {
    return
  }

  /**
    bytes=0-99，从0到99之间的数据字节。
    bytes=-100，文件的最后100个字节。
    bytes=100-，第100个字节开始之后的所有字节。
    bytes=0-99,200-299，从0到99之间的数据字节和200到299之间的数据字节。
   */
  // 判断返回数据区间
  if (isNaN(start)) { // -100情况
    start = size - end
    end = size - 1
  } else if (isNaN(end)) { // 100-情况
    end = size - 1
  }

  return {
    start: start,
    end: end
  }
}

exports.bodyParse = function(req, cb) {
  var bodyData = ''
  req.on('data', function(data) {

    bodyData += data
  })

  req.on('end', function() {
    const params = bodyData.split('&')
    var body = {}
    params.forEach(function(item) {
      const kv = item.split('=')
      body[kv[0]] = kv[1]
    })
    cb(body)
  })
}

// exports.mkdir = function()

exports.upload = function(uploadFolder, req, res, next) {

}
