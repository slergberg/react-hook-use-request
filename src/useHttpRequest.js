/* global File FormData */

import axios from 'axios'
import { useCallback, useEffect, useReducer, useRef } from 'react'

const initialState = { error: null, isLoading: false, response: null }

const reducerActions = {
  error: (state, { error } = {}) => ({
    ...state,
    error,
    isLoading: false,
    response: null,
  }),
  loading: (state) => ({
    ...state,
    isLoading: true,
  }),
  success: (state, { response } = {}) => ({
    ...state,
    error: null,
    isLoading: false,
    response,
  }),
}

const reducer = (state, action) => {
  const reducerAction = reducerActions[action.type]

  return reducerAction(state, action.payload)
}

const useHttpRequest = (url, options = {}) => {
  const {
    autoExecute = true,
    baseUrl = '',
    data = null,
    headers = {},
    method = 'GET',
    params = {},
    transformRequest,
    transformResponse,
  } = options

  const [state, dispatch] = useReducer(reducer, initialState)

  const dataRef = useRef(data)
  const headersRef = useRef(headers)
  const paramsRef = useRef(params)
  const transformRequestRef = useRef(transformRequest)
  const transformResponseRef = useRef(transformResponse)

  const cancelHttpRequestRef = useRef(() => {})
  const executeHttpRequestRef = useRef()

  useEffect(() => {
    executeHttpRequestRef.current = (optionsOverride = {}) => {
      dispatch({ type: 'loading' })

      const {
        baseUrl: requestBaseUrl = baseUrl,
        data: requestData = dataRef.current,
        headers: requestHeaders = headersRef.current,
        method: requestMethod = method,
        params: requestParams = paramsRef.current,
        transformRequest: requestTransformRequest = transformRequestRef.current,
        transformResponse: requestTransformResponse = transformResponseRef.current,
        url: requestUrl = url,
      } = optionsOverride

      const cancelTokenSource = axios.CancelToken.source()

      cancelHttpRequestRef.current = cancelTokenSource.cancel

      let requestFormData = requestData
      if (requestFormData) {
        const hasFiles =
          Object.values(requestData).filter((value) => value instanceof File)
            .length > 0

        if (hasFiles) {
          requestFormData = new FormData()
          Object.entries(requestData).forEach(([key, value]) => {
            requestFormData.append(key, value)
          })
        }
      }

      axios
        .request({
          cancelToken: cancelTokenSource.token,
          data: requestFormData,
          headers: requestHeaders,
          method: requestMethod,
          params: requestParams,
          transformRequest: requestTransformRequest,
          transformResponse: requestTransformResponse,
          url: `${requestBaseUrl}${requestUrl}`,
        })
        .then((result) => {
          dispatch({ type: 'success', payload: { response: result } })
        })
        .catch((err) => {
          if (!axios.isCancel(err)) {
            dispatch({
              type: 'error',
              payload: { error: err },
            })
          }
        })
    }

    return cancelHttpRequestRef.current
  }, [
    baseUrl,
    dataRef,
    headersRef,
    method,
    paramsRef,
    transformRequestRef,
    transformResponseRef,
    url,
  ])

  useEffect(() => {
    if (autoExecute) {
      executeHttpRequestRef.current()
    }
  }, [autoExecute, executeHttpRequestRef])

  const { error, isLoading, response } = state

  const isError = !!error

  const cancel = useCallback(
    (...args) => {
      cancelHttpRequestRef.current(...args)
    },
    [cancelHttpRequestRef],
  )

  const execute = useCallback(
    (...args) => {
      executeHttpRequestRef.current(...args)
    },
    [executeHttpRequestRef],
  )

  return {
    cancel,
    error,
    execute,
    isError,
    isLoading,
    response,
  }
}

export default useHttpRequest
