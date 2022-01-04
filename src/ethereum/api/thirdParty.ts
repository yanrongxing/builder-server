import gql from 'graphql-tag'
import { env } from 'decentraland-commons'
import {
  thirdPartyFragment,
  ThirdPartyFragment,
  ThirdPartyItemsFragment,
  thirdPartyItemFragment,
  tiersFragment,
  TierFragment,
} from './fragments'
import {
  BaseGraphAPI,
  PAGINATION_VARIABLES,
  PAGINATION_ARGUMENTS,
} from './BaseGraphAPI'

export const THIRD_PARTY_URL = env.get('THIRD_PARTY_GRAPH_URL', '')

const getThirdPartiesQuery = () => gql`
  query getThirdParties(${PAGINATION_VARIABLES}, $managers: [String!]) {
    thirdParties(${PAGINATION_ARGUMENTS}, where: { managers_contains: $managers, isApproved: true }) {
      ...thirdPartyFragment
    }
  }
  ${thirdPartyFragment()}
`

const getThirdPartyIdsQuery = () => gql`
  query getThirdPartyIds(${PAGINATION_VARIABLES}, $managers: [String!]) {
    thirdParties(${PAGINATION_ARGUMENTS}, where: { managers_contains: $managers, isApproved: true }) {
      id
    }
  }
`

const getThirdPartyQuery = () => gql`
  query getThirdParty($thirdPartyId: String!, $managers: [String!]) {
    thirdParties(
      first: 1
      where: {
        id: $thirdPartyId
        managers_contains: $managers
        isApproved: true
      }
    ) {
      ...thirdPartyFragment
    }
  }
  ${thirdPartyFragment()}
`

const getTiersQuery = () => gql`
  query getTiersQuery {
    tiers {
      ...tiersFragment
    }
  }
  ${tiersFragment()}
`

const getThirdPartyCollectionItemsQuery = () => gql`
  query getThirdPartyCollectionItems(${PAGINATION_VARIABLES}, $collectionId: String, $thirdPartyId: String) {
    items(${PAGINATION_ARGUMENTS}, where: { searchCollectionId : $collectionId, searchThirdPartyId: $thirdPartyId }) {
      ...thirdPartyItemFragment
    }
  }
  ${thirdPartyItemFragment()}
`

const getThirdPartyItemQuery = () => gql`
  query getThirdPartyItem($urn: String) {
    items(first: 1, where: { urn: $urn }) {
      ...thirdPartyItemFragment
    }
  }
  ${thirdPartyItemFragment()}
`

export class ThirdPartyAPI extends BaseGraphAPI {
  fetchThirdParties = async (
    manager?: string
  ): Promise<ThirdPartyFragment[]> => {
    return this.paginate(['thirdParties'], {
      query: getThirdPartiesQuery(),
      variables: { managers: manager ? [manager.toLowerCase()] : [] },
    })
  }

  fetchThirdPartyCollectionItems = async (
    thirdPartyId: string,
    collectionId: string
  ): Promise<ThirdPartyItemsFragment[]> => {
    return this.paginate(['items'], {
      query: getThirdPartyCollectionItemsQuery(),
      variables: { thirdPartyId, collectionId },
    })
  }

  fetchThirdPartyIds = async (manager: string = ''): Promise<string[]> => {
    const thirdParties = await this.paginate<{ id: string }, 'thirdParties'>(
      ['thirdParties'],
      {
        query: getThirdPartyIdsQuery(),
        variables: { managers: [manager.toLowerCase()] },
      }
    )
    return thirdParties.map((thirdParty) => thirdParty.id)
  }

  isManager = async (
    thirdPartyId: string,
    manager: string
  ): Promise<boolean> => {
    const {
      data: { thirdParties = [] },
    } = await this.query<{
      thirdParties: ThirdPartyFragment[]
    }>({
      query: getThirdPartyQuery(),
      variables: {
        thirdPartyId,
        managers: [manager.toLowerCase()],
      },
    })
    return thirdParties.length > 0
  }

  fetchTiers = (): Promise<TierFragment[]> => {
    return this.paginate(['tiers'], {
      query: getTiersQuery(),
    })
  }

  fetchItem = async (urn: string): Promise<ThirdPartyItemsFragment | null> => {
    const {
      data: { items = [] },
    } = await this.query<{
      items: ThirdPartyItemsFragment[]
    }>({
      query: getThirdPartyItemQuery(),
      variables: { urn },
    })

    return items.length > 0 ? items[0] : null
  }

  itemExists = async (urn: string): Promise<boolean> => {
    const item = await this.fetchItem(urn)
    return item != null
  }
}

export const thirdPartyAPI = new ThirdPartyAPI(THIRD_PARTY_URL)
