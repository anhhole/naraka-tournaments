import { configureStore, Store } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import { api } from "./services/api";
import { syncApi } from "./services/sync";

export function makeStore(): Store {
  const store = configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      [syncApi.reducerPath]: syncApi.reducer,
    },
    middleware: (getDefault) => 
      getDefault().concat(api.middleware, syncApi.middleware),
  });
  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

const store = makeStore();

export const useAppDispatch = () => useDispatch<AppDispatch>();

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
