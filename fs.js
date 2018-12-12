import fs from 'fs'
import silo from './node_modules/slio/index.js'

const
{curry}=silo.util,
joinPath=(path,file)=>path+(!path.match(/\/$/)?'/':'')+file,
url2dirs=url=>url.replace(/(\/|\\)$/,'').split(/\/|\\/),
url2name=url=>url2dirs(url).slice(-1)[0],
wait=function(fn,...args)
{
	return new Promise(function(res,rej)
	{
		fn(...args,(err,data)=>err?rej(err):res(data))
	})
},
asyncMap=function(arr,cb)
{
	return arr.reduce(async function(promiseArr,item,i,arr)
	{
		return [...await promiseArr,await cb(item,i,arr)]
	},Promise.resolve([]))
},
setup=fn=>curry(wait,fn),
service=Object.entries(
{
	deleteFile:fs.unlink,

	readDir:fs.readdir,//src,{encoding,withFileTypes}
	readFile:fs.readFile,//src,{encoding}

	writeDir:fs.mkdir,//src
	writeFile:fs.writeFile//src,data,{encoding}
})
.map(([name,fn])=>[name,setup(fn)])
.reduce((obj,[name,fn])=>Object.assign(obj,{[name]:fn}),{})

export default service


service.copyDir=function(src,dest)
{
	const name=url2name(src)

	return service.writeDir(joinPath(dest,name))
	.then(()=>service.readDir(src))
	.then(function(arr)
	{
		dest=joinPath(dest,name)

		return asyncMap
		(
			arr.map(item=>joinPath(src,item)),
			item=>service.copy(item,dest)
		)
	})
}
service.copyFile=function(src,dir)//modified times are different than native copy
{
	const dest=joinPath(dir,url2name(src))

	return new Promise(function(res,rej)
	{
		const
		rd=fs.createReadStream(src),
		wr=fs.createWriteStream(dest)

		[rd,wr].map(stream=>stream.on('error',rej))
		wr.on('close',res)
		rd.pipe(wr)
	})
}
service.deleteDir=function(src)
{
	return service.readDir(src)
	.then(function(arr)
	{

		return asyncMap
		(
			arr.map(item=>joinPath(src,item)),
			x=>service.delete(x)
		)
		.then(()=>wait(fs.rmdir,src))
	})
}
service.info=function(src)
{
	return wait(fs.lstat,src)
	.then(function(stats)
	{
		let {atime:accessed,birthtime:created,mtime:modified,ctime:changed,mode,size}=stats
		return {accessed,changed,created,mode,modified,size,isDir:stats.isDirectory()}
	})
}
service.isDir=(...args)=>wait(fs.lstat,...args).then(stats=>stats.isDirectory())
service.moveDir=function(src,dest)
{
	const name=url2name(src)

	return service.writeDir(joinPath(dest,name))
	.then(()=>service.readDir(src))
	.then(function(arr)
	{
		dest=joinPath(dest,name)

		return asyncMap
		(
			arr.map(item=>joinPath(src,item)),
			item=>service.move(item,dest)
		)
	})
	.then(()=>service.deleteDir(src))
}
service.moveFile=function(src,dir)
{
	const dest=joinPath(dir,url2name(src))

	return wait(fs.rename,src,dest)
}
service.renameFile=function(src,name)
{
	const dest=joinPath(url2dirs(src),name)

	return wait(fs.rename,src,dest)
}
service.renameDir=function(src,name)
{
	let dest=joinPath(url2dirs(src),name)

	return service.writeDir(dest)
	.then(()=>service.readDir(src))
	.then(function(arr)
	{
		return asyncMap
		(
			arr.map(item=>joinPath(src,item)),
			item=>service.move(item,dest)
		)
	})
	.then(()=>service.deleteDir(src))
}
service.writeDirs=function(src)//@todo need to make sure this works
{
	return wait(fs.lstat,src)
	.catch(function(err)
	{
		return err.code==='ENOENT'?
		service.writeDirs(url2dirs(src)).then(()=>writeDir(src)):
		Promise.reject(err)
	})
}

;'copy,delete,move,read,rename'
.split(',')
.forEach(function(fn)
{
	service[fn]=function(src,...args)
	{
		return service.isDir(src)
		.then(isDir=>service[fn+(isDir?'Dir':'File')](src,...args))
	}
})