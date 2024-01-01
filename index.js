import 'dotenv/config'
import express from 'express'
import {google} from 'googleapis'
import fs from 'fs'
import cors from 'cors'
const app=express()
app.use(cors())

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
);
try {
    const creds=fs.readFileSync('creds.json')
    oauth2Client.setCredentials(JSON.parse(creds))
    console.log("Credentials Found")
}catch (e) {
    console.log("Credentials Not Found")
}
const drive = google.drive({
    version: 'v3',
    auth: oauth2Client
});
// console.log(drive.files)
app.get('/auth',(req,res)=>{
    try {
        const creds=fs.readFileSync('creds.json')
        oauth2Client.setCredentials(JSON.parse(creds))
        res.json({status:"success"})
    }catch (e) {
        // generate a url that asks permissions for Blogger and Google Calendar scopes
        const scopes = [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];

        const url = oauth2Client.generateAuthUrl({
            // 'online' (default) or 'offline' (gets refresh_token)
            access_type: 'offline',

            // If you only need one scope you can pass it as a string
            scope: scopes
        });
        console.log(url)
        res.json({url})
        // res.json({msg:"creds not found",url:url})
    }

})
// console.log(drive)
app.get('/google/auth',async (req,res)=>{
    try {
        const {code}=req.query
        const {tokens}=await oauth2Client.getToken(code)
        fs.writeFileSync('creds.json',JSON.stringify(tokens))
        oauth2Client.setCredentials(tokens)
        res.json({status:"success",message:"autorization success"})
    }catch (e) {
        let message="Unable to Verify Token"
        if (e?.response?.data?.error){
            message=e.response.data.error
        }
        res.json({status:"failure",message})

    }

})
app.get('/delete/token',async (req,res)=>{
    try {
        fs.unlinkSync('creds.json')
    }catch (e) {

    }finally {
        res.json({status:"success"})
    }

})
app.get('/get_files',(req,res)=>{
    const files = [];
    let myProimise= new Promise(async (resolve, reject) => {
        try {
//fields: 'files(id, name)'
            let params={
                q:'mimeType="image/jpeg"',
                orderBy:'quotaBytesUsed asc',
                fields: 'files(id, name,quotaBytesUsed,size,thumbnailLink,iconLink)', //https://developers.google.com/drive/api/reference/rest/v3/files
                pageSize:5
            }
            const res = await drive.files.list(params);
            const res3 = await drive.files.get({
                fileId:'1lEiXfm71Pj55nmxJej2HnCeFceLyOmk8',
                alt: "media"
            });
            // res.json(res)
            console.log(typeof res3.data)
            // Array.prototype.push.apply(files, res.files);
            // res.data.files.forEach(function(file) {
            //     console.log('Found file:', file);
            // });
            resolve({list:res.data.files,data:res3.data});
        } catch (err) {
            // TODO(developer) - Handle error
            console.log(err);
            reject(err)
        }
    })
   myProimise.then(response=>{
       res.json(response)
   }).catch(err=>{
       res.json({err,msg:'something went wrong'})
   })
    // res.send("files ")

})
app.get('/get_drive',(req,res)=>{
    const files = [];
    let myProimise= new Promise(async (resolve, reject) => {
        try {
//fields: 'files(id, name)'
            let params={
                // q:'mimeType="image/jpeg"',
                // orderBy:'quotaBytesUsed asc',
                fields: 'user,storageQuota', //https://developers.google.com/drive/api/reference/rest/v3/files
                // pageSize:5
            }
            const res = await drive.about.get(params)
            resolve({list:res.data});
        } catch (err) {
            // TODO(developer) - Handle error
            console.log(err);
            reject(err)
        }
    })
   myProimise.then(response=>{
       res.json(response)
   }).catch(err=>{
       res.json({err,msg:'something went wrong'})
   })
    // res.send("files ")

})
app.get('/quick_access',(req,res)=>{
    const files = [];
    let myProimise= new Promise(async (resolve, reject) => {
        try {
            //fields: 'files(id, name)'
            let params={
                // q:'mimeType="image/jpeg"',
                orderBy:'modifiedByMeTime desc',
                fields: 'files(id, name,size,modifiedByMeTime,thumbnailLink,iconLink,fullFileExtension)', //https://developers.google.com/drive/api/reference/rest/v3/files
                pageSize:4
            }
            const res = await drive.files.list(params);
            resolve({data:res.data.files});
        } catch (err) {
            // TODO(developer) - Handle error
            console.log(err);
            reject(err)
        }
    })
    myProimise.then(response=>{
        res.json(response)
    }).catch(err=>{
        res.json({err,msg:'something went wrong'})
    })
    // res.send("files ")

})
app.get('/custom/:page/:size',(req,res)=>{
    const files = [];
    let myProimise= new Promise(async (resolve, reject) => {
        try {
            let fileSize=100,page='';
            if (req.params && req.params.size && parseInt(req.params.size)>0){
                fileSize=req.params.size
            }
            console.log(req.params.page)
            if (req.params && req.params.page){
                page=req.params.page
            }
            //fields: 'files(id, name)'
            let params={
                // q:'mimeType="image/jpeg"',
                orderBy:'createdTime desc',
                fields: 'nextPageToken, files(id, name,size,createdTime,thumbnailLink,iconLink,mimeType)', //https://developers.google.com/drive/api/reference/rest/v3/files
                pageSize:fileSize
            }
            if (page==='picture'){
                params['q']=`mimeType contains 'image/'`
            }
            if (page==='video'){
                params['q']=`mimeType contains 'video/'`
            }
            if (page==='document'){
                params['q']=`mimeType contains 'application/'`
            }
            if (page==='shared'){
                params['q']=`sharedWithMe`
            }
            if (page==='starred'){
                params['q']=`starred`
            }
            if (page==='all_files'){
                // params['q']=`starred`
            }

            if (page==='folder' && req.params && req.params.size){
                params['q']=`'${req.params.size}' in parents`
                delete params['pageSize']
            }

            if (page==='search' && req.params && req.params.size){
                // params['q']=` name='${req.params.size}'`
                // params['q']="name = '"+req.params.size+"'"
                params['q']="name contains '"+req.params.size+"'"
                delete params['pageSize']
                delete params['orderBy']
            }

            // resolve({params})
            // return;
            if ((page==='' || !page) && params['q']){
                delete params['q']
            }
            const res = await drive.files.list(params);
            console.log(params)
            // console.log(res)
            resolve({data:res.data.files});
        } catch (err) {
            // TODO(developer) - Handle error
            console.log(err);
            reject(err)
        }
    })
    myProimise.then(response=>{
        res.json(response)
    }).catch(err=>{
        res.json({err,msg:'something went wrong'})
    })
    // res.send("files ")

})
app.get('/file_manager',(req,res)=>{
    const files = [];
    let myProimise= new Promise(async (resolve, reject) => {
        try {
            //fields: 'files(id, name)'
            let params={
                q:'mimeType="application/vnd.google-apps.folder"',
                orderBy:'createdTime desc',
                fields: 'files(id, name,size,createdTime,thumbnailLink,mimeType,iconLink)', //https://developers.google.com/drive/api/reference/rest/v3/files
                pageSize:2
            }
            let params2={
                q:'mimeType="application/pdf"',
                orderBy:'createdTime desc',
                fields: 'files(id, name,size,createdTime,thumbnailLink,mimeType,iconLink)', //https://developers.google.com/drive/api/reference/rest/v3/files
                pageSize:2
            }
            const res = await drive.files.list(params);
            const res2 = await drive.files.list(params2);
            resolve([...res.data.files,...res2.data.files]);
        } catch (err) {
            // TODO(developer) - Handle error
            console.log(err);
            reject(err)
        }
    })
    myProimise.then(response=>{
        res.json(response)
    }).catch(err=>{
        res.json({err,msg:'something went wrong'})
    })
    // res.send("files ")

})
app.get('/get_file/:id',(req,res)=>{
    const {id}=req.params;
    let myProimise= new Promise(async (resolve, reject) => {
        try {
            let data=await drive.files.get({fileId: id, alt: "media"})
                // (err, { data }) => {
                //     if (err) {
                //         console.log(err);
                //         return;
                //     }
                //     let buf = [];
                //     data.on("data", (e) => buf.push(e));
                //     data.on("end", () => {
                //         const buffer = Buffer.concat(buf);
                //         console.log(buffer)
                //         resolve(buffer)
                //     });
                // }
            // );

            function base64toBlob(base64Data, contentType) {
                contentType = contentType || '';
                var sliceSize = 1024;
                var byteCharacters = atob(base64Data);
                var bytesLength = byteCharacters.length;
                var slicesCount = Math.ceil(bytesLength / sliceSize);
                var byteArrays = new Array(slicesCount);

                for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
                    var begin = sliceIndex * sliceSize;
                    var end = Math.min(begin + sliceSize, bytesLength);

                    var bytes = new Array(end - begin);
                    for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
                        bytes[i] = byteCharacters[offset].charCodeAt(0);
                    }
                    byteArrays[sliceIndex] = new Uint8Array(bytes);
                }
                return new Blob(byteArrays, { type: contentType });
            }
            let name='IMG_1759.jpg'
            let stringData=data
            console.log(typeof stringData)
            console.log("manini",stringData[0])
            var buffer = Buffer.from(data.data);
            const newFileName = 'nodejs.png';
            // now buffer contains the contents of the file we just read
            fs.writeFileSync(`./${name}`, buffer, 'utf-8')
            // console.log(data)
            resolve("Done")
            // resolve({list:res.data.files,file:res3});
        } catch (err) {
            // TODO(developer) - Handle error
            console.log(err);
            reject(err)
        }
    })
   myProimise.then(response=>{
       res.send(response)
   }).catch(err=>{
       res.json({err,msg:'something went wrong'})
   })
    // res.send("files ")

})
app.listen(process.env.PORT,()=>{
    console.log("listening on Port",process.env.PORT)
})
console.log("running",process.env.S3_BUCKET)