noteStore = require('./evernote')
Evernote = require('evernote').Evernote
fs = require('fs')
crypto = require('crypto')
mime = require('mime')
async = require('async')
fse = require('fs-extra')

MIME_TO_EXTESION_MAPPING = {
  'image/png': '.png',
  'image/jpg': '.jpg',
  'image/jpeg': '.jpg',
  'image/gif': '.gif'
}



getImgs = (cb) ->

  fs.readdir process.cwd(), (err, files) ->
    return cb(err) if err

    imgFiles = []
    for f in files
      type = mime.lookup(f)
      if type of MIME_TO_EXTESION_MAPPING and fs.statSync(f).size < 1024 * 1024 * 10
        imgFiles.push f

    cb(null, imgFiles)


filterImgs = (imgFiles, cb) ->
#  console.log imgFiles
  filter = {}
  index = 1
  count = 0
  for k, v in imgFiles
    if not filter[index]
      filter[index] = []

    count += fs.statSync(k).size
    if count < 1024 * 1024 * 10
      filter[index].push k

    else
      index += 1
      if fs.statSync(k).size < 1024 * 1024 * 10
        filter[index] = []
        filter[index].push k
        count = fs.statSync(k).size


  cb(filter)








#count = 0
#for i in [ '23.jpg', '24.jpg' ]
#  count += fs.statSync(i).size
#
#console.log "1024 * 1024 * 10 =>", 1024*1024*10
#console.log "count =>", count







async.auto
  getImg:(cb) ->
    getImgs (err, res) ->
      return console.log err if err

      cb(null, res)


  filter:['getImg', (cb, result) ->
    imgs = result.getImg
    filterImgs imgs, (filter) ->
      cb(null, filter)
  ]

  copFile:['filter', (cb, result) ->
    filter = result.filter
    console.log filter
    for k, v of filter
      for i in v
        if fs.existsSync k
          fse.copySync i, k + '/' +  i
        else
          fs.mkdirSync k
          fse.copySync i, k + '/' + i
  ]





createRes = (imgFiles, cb) ->
  resources = []
  async.eachSeries imgFiles, (item, callback) ->
    image = fs.readFileSync(item)
    hash = image.toString('base64')
    data = new Evernote.Data()
    data.size = image.length
    data.bodyHash = hash
    data.body = image

    resource = new Evernote.Resource()
    resource.mime = mime.lookup(item)
    resource.data = data

    resource.push resource

    callback()

  ,(eachErr) ->
    return cb(eachErr) if eachErr






createNote = (cb) ->
  note = new Evernote.Note()
  note.title = "Test Note"



