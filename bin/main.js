#!/usr/bin/env node
const request = require("request")
const github = require("octonode")
const client = github.client()
const getAppDataPath = require("appdata-path")
const path = require("path")
const fs = require("fs")
const rimraf = require("rimraf")
const npm = require("npm")
const exec = require("child_process").exec

const dot_graviton = path.join(getAppDataPath(), ".graviton")

const getConfig = callback => {
	fs.readFile(
		path.join(dot_graviton, "config.json"),
		{ encoding: "utf-8" },
		function(err, data) {
			return callback(JSON.parse(data))
		}
	)
}

let argumentsPass = (() => {
	return process.argv.map(function(item, index) {
		if (index > 1) {
			return item
		}
	})
})()

argumentsPass = argumentsPass.filter(Boolean) // [1,2,"b",{},3,5]

const message = (type, text) => {
	switch (type) {
		case "info":
			console.log("\x1b[34m", "Graviton::", "\x1b[0m", text)
			break
		case "warn":
			console.warn("\x1b[33m", "WARN::", "\x1b[0m", text)
			break
		case "error":
			console.error("\x1b[31m", "ERROR::", "\x1b[0m", text)
			break
		case "success":
			console.log("\x1b[32m", "Success::", "\x1b[0m", text)
			break
	}
}
getConfig(function(config) {
	if (config.build == undefined || parseInt(config.build) < 190724) {
		message(
			"warn",
			"This CLI needs the last Graviton version, v1.1.0 You have the build " +
				config.build +
				" ."
		)
		return
	}
})

if (!fs.existsSync(dot_graviton)) {
	message("error", "Graviton is not installed!")
	return
}

const help = `

--help (Show all commands)
  
-v ( Show the installed Graviton version and its' build)
 
-l / --list (List all the installed plugins & themes of Graviton)

-m / --market (List all the installed plugins & themes of Graviton)
  
-i / --install + Owner/RepoName ( Install a plugin directly from the repository)
 
-u / --uninstall + PluginName (Uninstall an installed plugin)

-n / --new (Creates a basic plugin template)

--update + Ownser/RepoName (Update a plugin)
  

`

const pull = (full_name, name, call) => {
	rimraf.sync(path.join(dot_graviton, "plugins", name))
	const degit = require("degit")
	const emitter = degit(full_name)
	emitter.clone(path.join(dot_graviton, "plugins", name), name).then(() => {
		call()
	})
}

switch (argumentsPass[0]) {
	case "-v":
		getConfig(function(data) {
			message("info", `${data.version} · ${data.build}`)
		})
		break
	case "-l":
	case "--list":
		let string = "\n"
		fs.readdir(path.join(dot_graviton, "plugins"), function(err, list) {
			list.map(function(value, index) {
				string += `${index} --> ${value} \n`
			})
			console.log(string)
		})
		break
	case "-m":
	case "--market":
		request(
			"https://raw.githubusercontent.com/Graviton-Code-Editor/plugins_list/master/list.json",
			function(error, response, body) {
				console.log(
					(function() {
						let string = "\n"
						JSON.parse(body).map(function(value, index) {
							string += `${index} --> ${value} \n`
						})
						return string
					})()
				)
			}
		)
		break
	case "--help":
		console.log(help)
		break
	case "-i":
	case "--install":
		if (argumentsPass[1] == undefined) {
			message("error", "Needs one more argument.")
			return
		}
		client.repo(argumentsPass[1]).info(function(err, data) {
			if (err) {
				message("error", "Cannot find the typed plugin.")
				return
			}
			if (fs.existsSync(path.join(dot_graviton, "plugins", data.name))) {
				message("success", `${data.name} is already installed.`)
				return
			}
			const degit = require("degit")
			const emitter = degit(data.clone_url)
			emitter
				.clone(path.join(dot_graviton, "plugins", data.name), data.name)
				.then(() => {
					fs.readFile(
						path.join(dot_graviton, "plugins", data.name, "package.json"),
						"utf8",
						function(err, data) {
							let package_json = JSON.parse(data)
							if (package_json.dependencies == undefined) {
								message(
									"success",
									`Installed: ${package_json.name} · ${package_json.version}`
								)
								return
							}
							message(
								"info",
								`Dependencies of: ${package_json.name} are being installed`
							)
							npm.load(
								{
									prefix: path.join(
										dot_graviton,
										"plugins",
										package_json["name"]
									)
								},
								function(er) {
									if (er) return er
									for (const depen in package_json["dependencies"]) {
										npm.commands.install([depen], function(er, data) {
											if (er) return er
											message(
												"success",
												`Installed: ${package_json.name} · ${package_json.version}`
											)
										})
									}
								}
							)
						}
					)
				})
		})
		break
	case "-n":
	case "--new":
		switch (argumentsPass[1]) {
			case "plugin":
				if (
					fs.existsSync(path.join(dot_graviton, "plugins", "Plugin-Example"))
				) {
					message("error", "There is already a created template.")
					return
				}
				const degit = require("degit")
				const emitter = degit("Graviton-Code-Editor/Plugin-Example")
				emitter
					.clone(
						path.join(dot_graviton, "plugins", "Plugin-Example"),
						"Plugin-Example"
					)
					.then(() => {
						fs.readFile(
							path.join(
								dot_graviton,
								"plugins",
								"Plugin-Example",
								"package.json"
							),
							{ encoding: "utf-8" },
							function(err, data) {
								const package_json = JSON.parse(data)
								if (package_json.dependencies == undefined) {
									message(
										"success",
										`Installed: ${package_json.name} · ${package_json.version}`
									)
									return
								}
								message(
									"info",
									`Dependencies of: ${package_json.name} are being installed`
								)
								npm.load(
									{
										prefix: path.join(
											dot_graviton,
											"plugins",
											package_json["name"]
										)
									},
									function(er) {
										if (er) return er
										for (const depen in package_json["dependencies"]) {
											npm.commands.install([depen], function(er, data) {
												if (er) return er
												message(
													"success",
													`Installed: ${package_json.name} · ${package_json.version}`
												)
											})
										}
									}
								)
							}
						)
					})
				break
			default:
				message(
					"error",
					"There is nothing to create by name " + argumentsPass[2]
				)
				return
		}
		break
	case "-u":
	case "--uninstall":
		if (argumentsPass[1] == undefined) {
			message("error", "Needs one more argument.")
			return
		}
		if (!fs.existsSync(path.join(dot_graviton, "plugins", argumentsPass[1]))) {
			message("error", `${argumentsPass[1]} is not installed.`)
			return
		}
		rimraf.sync(path.join(dot_graviton, "plugins", argumentsPass[1]))
		message("success", `${argumentsPass[1]} has been uninstalled.`)
		break
	case "--update":
		switch (argumentsPass[1]) {
			case undefined:
				message("error", "Needs one more argument.")
				break
			default:
				client.repo(argumentsPass[1]).info(function(err, data) {
					if (err) {
						message("error", "Cannot find the typed plugin.")
						return
					}
					if (!fs.existsSync(path.join(dot_graviton, "plugins", data.name))) {
						message("error", `${data.name} is not installed.`)
						return
					}
					pull(data.full_name, data.name, function() {
						fs.readFile(
							path.join(dot_graviton, "plugins", data.name, "package.json"),
							{ encoding: "utf-8" },
							function(err, data) {
								const package = JSON.parse(data)
								if (package.dependencies == undefined) {
									message(
										"success",
										`Installed: ${package.name} · ${package.version}`
									)
									return
								}
								message(
									"info",
									`Dependencies of: ${package.name} are being installed`
								)
								npm.load(
									{
										prefix: path.join(dot_graviton, "plugins", package["name"])
									},
									function(er) {
										if (er) return er
										for (const depen in package["dependencies"]) {
											npm.commands.install([depen], function(er, data) {
												if (er) return er
												message(
													"success",
													`Installed: ${package.name} · ${package.version}`
												)
											})
										}
									}
								)
							}
						)
					})
				})
		}
		break
	default:
		if (fs.existsSync(path.join(process.cwd(), argumentsPass[0]))) {
			switch (process.platform) {
				case "win32":
					exec(
						`${path
							.join(
								getAppDataPath(),
								"..",
								"Local",
								"Programs",
								"Graviton",
								"Graviton.exe"
							)
							.replace(/\\/g, "\\\\")} ${path.join(
							process.cwd(),
							argumentsPass[0]
						)}`,
						function(err, stdout, stderr) {
							if (err) {
								throw err
							}
						}
					)
					break
				case "linux":
					exec(
						`graviton ${path.join(process.cwd(), argumentsPass[0])}`,
						function(err, stdout, stderr) {
							if (err) {
								throw err
							}
						}
					)
					break
				case "darwin":
					exec(
						`open graviton ${path.join(process.cwd(), argumentsPass[0])}`,
						function(err, stdout, stderr) {
							if (err) {
								throw err
							}
						}
					)
					break
			}
		} else {
			message("error", "Command not found.\n" + help)
		}
}
