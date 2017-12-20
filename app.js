const http = require('http')
const fs = require('fs')
const url = require('url')
const path = require('path')
const mime = require('mime') // 获取MIME类型
const config = require('./config/default')


const server = http.createServer()

server.on('request', function(req, res) {
  const pathName = url.parse(req.url).pathname
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

        res.setHeader('Content-Type', 'text/html')
        res.writeHead(200, 'OK')
        res.end(content)
      })
    } else { // 如果不是文件夹  则预览文件
      // 获取文件MIME类型
      const mimeType = mime.getType(realPath)
      res.writeHead(200, 'OK', {
        'Content-Type': mimeType
      })
      fs.createReadStream(realPath).pipe(res)
    }
  })
})


server.listen(config.Default.port, function() {
  console.log("Server is running on port " + config.Default.port)
})
