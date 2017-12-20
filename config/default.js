exports.Default = {
  rootPath: 'assets/',
  port: process.env.PORT || 3000,
  indexHtml: 'index.html',
  notFount: '404.html'
}

exports.Expires = {
  fileMatch: /^(gif|png|jpg|jpeg|js|css)$/ig, // 指定需要缓存的文件的类型
  maxAge: 60*60*24*365 // 过期时间
}

exports.Compress = {
  zipMatch: /css|js|html/ig // 需要压缩的文件类型
}
