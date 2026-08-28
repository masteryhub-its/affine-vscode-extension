export const CURRENT_USER_QUERY = `
query CurrentUser {
  currentUser {
    id
    email
    name
    avatarUrl
  }
}
`;

export const PAGE_AUTHORS_QUERY = `
query PageAuthors($workspaceId: String!, $docId: String!) {
  workspace(id: $workspaceId) {
    doc(docId: $docId) {
      createdBy {
        name
        avatarUrl
      }
      lastUpdatedBy {
        name
        avatarUrl
      }
    }
  }
}
`;

export const PUBLIC_USER_QUERY = `
query PublicUser($id: String!) {
  publicUserById(id: $id) {
    id
    name
    avatarUrl
  }
}
`;

export const WORKSPACES_QUERY = `
query Workspaces {
  workspaces {
    id
  }
}
`;

export const WORKSPACE_DOCS_QUERY = `
query WorkspaceDocs($workspaceId: String!, $first: Int!, $after: String) {
  workspace(id: $workspaceId) {
    id
    docs(pagination: { first: $first, after: $after }) {
      edges {
        cursor
        node {
          id
          workspaceId
          title
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
`;

export const SEARCH_DOCS_QUERY = `
query SearchDocs($workspaceId: String!, $keyword: String!, $limit: Int) {
  workspace(id: $workspaceId) {
    id
    searchDocs(input: { keyword: $keyword, limit: $limit }) {
      docId
      title
      highlight
    }
  }
}
`;

export const GENERATE_ACCESS_TOKEN_MUTATION = `
mutation GenerateAccessToken($name: String!) {
  generateUserAccessToken(input: { name: $name }) {
    id
    token
  }
}
`;
