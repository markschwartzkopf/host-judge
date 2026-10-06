import * as nodecgApiContext from "./nodecg-api-context";

const nodecg = nodecgApiContext.get();

const { exec, execSync } = require("node:child_process");
const process = require("process");

nodecg.listenFor("restartPM2", () => {
	try {
		const pm2_proc_list: any[] = JSON.parse(execSync(`pm2 jlist`));
		// console.log(`current pid: ${process.pid}`);
		for (const pm2_proc of pm2_proc_list) {
			// console.log(`name: ${pm2_proc.name}; id: ${pm2_proc.pm_id}; pid: ${pm2_proc.pid}`);
			if (pm2_proc.pid == process.pid) {
				nodecg.log.info(
					`(pm2) restarting instance name: ${pm2_proc.name} with id: ${pm2_proc.pm_id}`,
				);
				exec(`pm2 restart ${pm2_proc.pm_id}`, (err: Error, output: any) => {
					if (err) {
						// log and return if we encounter an error
						nodecg.log.error(err.message);
						return "Error.";
					}
					//technically this will never be reachable since if the command is successful the server restarts
					nodecg.log.info("Restart successful.");
					return "Server restarted.";
				});
			}
		}
	} catch {
		nodecg.log.error("Error getting PM2 process ID.");
	}
});
