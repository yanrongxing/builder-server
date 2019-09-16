import { server } from 'decentraland-server'
import Ajv from 'ajv'

import { Router } from '../common/Router'
import { HTTPError } from '../common/HTTPError'
import { authentication, AuthRequest, modelExists } from '../middleware'
import { modelAuthorization } from '../middleware/authorization'
import { Project } from '../Project'
import { Deployment } from './Deployment.model'
import { DeploymentAttributes, deploymentSchema } from './Deployment.types'

const ajv = new Ajv()

const projectExists = modelExists(Project)
const projectAuthorization = modelAuthorization(Project)
const deploymentAuthorization = modelAuthorization(Deployment)

export class DeploymentRouter extends Router {
  mount() {
    /**
     * Get all deployments
     */
    this.router.get(
      '/deployments',
      authentication,
      server.handleRequest(this.getDeployments)
    )

    /**
     * Get a projects deployment
     */
    this.router.get(
      '/projects/:id/deployment',
      authentication,
      projectExists,
      projectAuthorization,
      server.handleRequest(this.getProjectDeployment)
    )

    /**
     * Upsert a project deployment
     */
    this.router.put(
      '/projects/:id/deployment',
      authentication,
      projectExists,
      projectAuthorization,
      server.handleRequest(this.upsertDeployment)
    )

    /**
     * Delete project deployment
     */
    this.router.delete(
      '/projects/:id/deployment',
      authentication,
      projectExists,
      projectAuthorization,
      deploymentAuthorization,
      server.handleRequest(this.deleteDeployment)
    )
  }

  async getDeployments(req: AuthRequest) {
    const user_id = req.auth.sub
    return Deployment.find<DeploymentAttributes>({ user_id })
  }

  async getProjectDeployment(req: AuthRequest) {
    const id = server.extractFromReq(req, 'id')
    const user_id = req.auth.sub
    return Deployment.findOne<DeploymentAttributes>({ id, user_id })
  }

  async upsertDeployment(req: AuthRequest) {
    const id = server.extractFromReq(req, 'id')
    const deploymentJSON: any = server.extractFromReq(req, 'deployment')
    const user_id = req.auth.sub

    const validator = ajv.compile(deploymentSchema)
    validator(deploymentJSON)

    if (validator.errors) {
      throw new HTTPError('Invalid schema', validator.errors)
    }

    const attributes = { ...deploymentJSON, user_id } as DeploymentAttributes

    if (id !== attributes.id) {
      throw new HTTPError('The body and URL deployment ids do not match', {
        urlId: id,
        bodyId: attributes.id
      })
    }

    return new Deployment(attributes).upsert()
  }

  async deleteDeployment(req: AuthRequest) {
    const id = server.extractFromReq(req, 'id')
    const user_id = req.auth.sub

    await Deployment.delete({ id, user_id })

    return true
  }
}