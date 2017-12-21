const http = require('http')
const fs = require('fs')
const url = require('url')
const path = require('path')
const mime = require('mime') // 获取MIME类型
const zlib = require('zlib') // 文件压缩
const config = require('./config/default.js')
const utils = require('./utils.js')


const server = http.createServer()

server.on('request', function(req, res) {
  // http://localhost:3000/husky%E7%9A%84%E5%89%AF%E6%9C%AC.jpg
  // 将url转码encodeURI(URI)后的字符 进行解码
  const _url = decodeURI(req.url)
  const pathName = url.parse(_url).pathname
  const realPath = path.normalize(config.Default.rootPath + pathName) // normalize格式化路径
  console.log('GET: ' + path.normalize(realPath));

  fs.stat(realPath, function(err, stats) {
    if (err) {
      if (err.code === 'ENOENT') { // 无此文件或目录
        res.writeHead(404, {
          'Content-Type': 'text/html; charset=utf-8',
        })
        res.end('<h1>404<h1>')
      } else {
        res.writeHead(500)
        res.end(err)
      }
      return
    }

    if (stats.isDirectory()) { // 文件夹 列出所有文件

      directoryResponseDeal(realPath, pathName, req, res)
    } else { // 如果不是文件夹  则预览文件

      fileResponseDeal(realPath, stats, req, res)
    }
  })
})

// 当前请求为文件夹的处理方法
function directoryResponseDeal(realPath, pathName, req, res) {
  fs.readdir(realPath, function(err, files) {
    if (err) {
      console.log(err);
      return
    }

    var content = `<h1>Index of ${pathName}</h1>`
    content += `<p><a href='..'>..</a></p>`

    files.forEach(function(file) {
      const filePath = path.join(realPath, file)
      const stat = fs.statSync(filePath)
      if (stat && stat.isDirectory()) {
        content += `<p><a href=${file+'/'}>${file+'/'}</p>`
      } else {
        content += `<p><a href=${file}>${file}</p>`
      }
    })

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.writeHead(200, 'OK')
    res.end(content)
  })
}

// 当前请求为文件的处理方法
function fileResponseDeal(realPath, stats, req, res) {
  var ext = path.extname(realPath)
  ext = ext ? ext.slice(1) : 'unknown'

  // 判断文件类型是否是需要缓存的文件类型
  if (ext.match(config.Expires.fileMatch)) {
    /* 浏览器在发送请求之前由于检测到Cache-Control和Expires
    （Cache-Control的优先级高于Expires，但有的浏览器不支持Cache-Control，这时采用Expires）
    如果没有过期，则不会发送请求，而直接从缓存中读取文件。*/
    var expires = new Date()
    expires.setTime(expires.getTime() + config.Expires.maxAge*1000)
    res.setHeader('Expires', expires.toUTCString())
    res.setHeader('Cache-Control', 'max-age=' + config.Expires.maxAge)
  }

  // 读取文件最后修改时间
  const lastModified = stats.mtime.toUTCString()
  res.setHeader('Last-Modified', lastModified)

  // 判断浏览器是否发送了 if-modified-since (修改自什么时间) 请求头信息
  const ifModifiedSince = req.headers['if-modified-since']
  if (ifModifiedSince && ifModifiedSince == lastModified) {
    // 如果最后修改时间与磁盘上文件修改的时间相符合  则返回304状态
    res.writeHead(304, 'Not Modified')
    res.end()
    return
  }


  // 判断是否满足range（断点支持）条件
  if (req.headers['range']) {
    const range = utils.parseRange(req.headers['range'], stats.size)
    if (range) {
      res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + stats.size)
      res.setHeader('Content-Length', range.end - range.start + 1)
      const options = {
        start: range.start,
        end: range.end
      }
      var raw = fs.createReadStream(realPath, options)
      res.writeHead(206, 'Partial Content') // 局部内容
      raw.pipe(res)
    } else {
      res.removeHeader('Content-Length')
      res.writeHead(614, 'Request Range Not Satisfiable')
      res.end()
    }
    return
  }

  // 创建一个可读流
  var raw = fs.createReadStream(realPath)

  // 判断是否需要压缩的文件类型
  if (ext.match(config.Compress.zipMatch)) {
    // gzip压缩文件
    raw = compressHandle(raw, req, res)
  }

  // 获取文件MIME类型  注：setHeader只能写在 writeHead之前 不然会报错
  const mimeType = mime.getType(realPath)
  res.writeHead(200, 'OK', {
    'Content-Type': mimeType
  })

  raw.pipe(res)
}

function compressHandle(raw, req, res) {
  var stream = raw
  const acceptEncoding = req.headers['accept-encoding']
  // 判断浏览器是否支持gzip压缩
  if (acceptEncoding.match(/\bgzip\b/)) {
    res.setHeader('Content-Encoding', 'gzip')
    stream = raw.pipe(zlib.createGzip())
  } else if (acceptEncoding.match(/\bdeflate\b/)) {
    res.setHeader('Content-Encoding', 'deflate')
    stream = raw.pipe(zlib.createDeflate())
  }
  return stream
}


server.listen(config.Default.port, function() {
  console.log("Server is running on port " + config.Default.port)
})
