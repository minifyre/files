import fs from 'fs'

const
curry=(fn,...xs)=>(...ys)=>fn(...xs,...ys),
joinPath=(path,filename)=>path+(!path.match(/\/$/)?'/':'')+filename,
url2dirs=url=>url.replace(/(\/|\\)$/,'').split(/\/|\\/),
url2name=url=>url2dirs(url).slice(-1)[0],
wait=function(fn,...args)
{
	return new Promise((res,rej)=>fn(...args,(err,rtn)=>err?rej(err):res(rtn)))
},
asyncMap=function(arr,fn)
{
	return arr.reduce
	(
		async (arr,...args)=>[...await arr,await fn(...args)],
		Promise.resolve([])
	)
},
mapPath=(arr,src)=>arr.map(x=>joinPath(src,x))
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
	dest=joinPath(dest,name)

	return service.writeDir(joinPath(dest,name))
	.then(()=>service.readDir(src))
	.then(arr=>asyncMap(mapPath(arr,src),x=>service.copy(x,dest)))
}
//modified times are different than native copy
service.copyFile=function(src,dir)
{
	const dest=joinPath(dir,url2name(src))

	return new Promise(function(res,rej)
	{
		const
		rd=fs.createReadStream(src),
		wr=fs.createWriteStream(dest)

		;[rd,wr].map(stream=>stream.on('error',rej))
		wr.on('close',res)
		rd.pipe(wr)
	})
}
service.deleteDir=function(src)
{
	return service.readDir(src)
	.then(arr=>asyncMap(mapPath(arr,src),x=>service.delete(x)))
	.then(()=>wait(fs.rmdir,src))
}
service.info=async function(src)
{//@todo +catch()
	const {atime:accessed,birthtime:created,mtime:modified,ctime:changed,mode,size}=await wait(fs.lstat,src)

	return {accessed,changed,created,mode,modified,size,isDir:stats.isDirectory()}
}
service.isDir=(...args)=>wait(fs.lstat,...args).then(stats=>stats.isDirectory())
service.moveDir=function(src,dest)
{
	const name=url2name(src)
	dest=joinPath(dest,name)

	return service.writeDir(joinPath(dest,name))
	.then(()=>service.readDir(src))
	.then(arr=>asyncMap(mapPath(arr,src),x=>service.move(x,dest)))
	.then(()=>service.deleteDir(src))
}
service.moveFile=(src,dir)=>wait(fs.rename,src,joinPath(dir,url2name(src)))
service.renameFile=(src,name)=>wait(fs.rename,src,joinPath(url2dirs(src),name))
service.renameDir=function(src,name)
{
	let dest=joinPath(url2dirs(src),name)

	return service.writeDir(dest)
	.then(()=>service.readDir(src))
	.then(arr=>asyncMap(mapPath(arr,src),item=>service.move(item,dest)))
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