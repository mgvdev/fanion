/*
|--------------------------------------------------------------------------
| Configure hook
|--------------------------------------------------------------------------
|
| The configure hook is called when someone runs "node ace configure <package>"
| command. You are free to perform any operations inside this function to
| configure the package.
|
| To make things easier, you have access to the underlying "ConfigureCommand"
| instance and you can use codemods to modify the source files.
|
*/

import ConfigureCommand from '@adonisjs/core/commands/configure'
import { stubsRoot } from './stubs/main.js'

export async function configure(command: ConfigureCommand) {
  const codemods = await command.createCodemods()

  /**
   * Publish config file
   */
  await codemods.makeUsingStub(stubsRoot, 'config/fanion.stub', {})

  /**
   * Register provider
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@fanion/adonisjs/fanion_provider')
  })

  /**
   * Define environment variables
   */
  await codemods.defineEnvVariables({
    FANION_DEBUG: 'false',
  })

  /**
   * Define environment variables validation
   */
  // await codemods.defineEnvValidations({
  //   FANION_DEBUG: 'Env.schema.boolean.optional()',
  // })

  /**
   * Install optional dependencies if needed
   */
  const installKnex = await command.prompt.confirm(
    'Do you want to install Knex.js for database storage support?',
    {
      default: false,
    }
  )

  if (installKnex) {
    const packages = ['knex']
    const dbDriver = await command.prompt.choice(
      'Which database driver would you like to install?',
      [
        {
          name: 'sqlite3',
          message: 'SQLite',
        },
        {
          name: 'pg',
          message: 'PostgreSQL',
        },
        {
          name: 'mysql2',
          message: 'MySQL',
        },
        {
          name: 'better-sqlite3',
          message: 'Better SQLite3',
        },
      ]
    )

    packages.push(dbDriver)
    await codemods.installPackages(packages.map((pkg) => ({ name: pkg, isDevDependency: false })))
  }

  /**
   * Show completion message
   */
  command.logger.success('Fanion has been configured successfully!')
  command.logger.info('Next steps:')
  command.logger.info('1. Update config/fanion.ts with your feature flag definitions')
  command.logger.info('2. Use await fanion.active("flag-name") to check feature flags')
  command.logger.info('3. Use @requireFeature("flag-name") decorator in controllers')
  command.logger.info('4. Use featureFlag("flag-name") middleware in routes')
}
