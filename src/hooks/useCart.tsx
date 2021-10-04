import { createContext, ReactNode, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if(storagedCart)
      return JSON.parse(storagedCart)

    return []
  });

  const prevCartRef = useRef<Product[]>()

  useEffect(() => {
    prevCartRef.current = cart
  })

  const cartPreviousValue = prevCartRef.current ?? cart

  useEffect(() => {
    if(cart !== cartPreviousValue) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }

  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {

      const { data } = await api.get(`stock/${productId}`)
      const stockAmount = data.amount

      const product = cart.find(c => c.id === productId)

      if(product) {
        if(stockAmount <= product.amount) {
          toast.error('Quantidade solicitada fora de estoque');
        } else {
          const newCart = cart.map(cart => {
            if(cart.id === product.id) {
              return { ...cart, amount: cart.amount + 1 }
            } else {
              return cart
            }
          })

          setCart(newCart)
        }
      } else {
        const { data } = await api.get(`products/${productId}`)

        setCart([...cart, { ...data, amount: 1 }])
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(cart => cart.id !== productId);

      if(newCart.length !== cart.length)
        setCart(newCart)
      else
        throw Error()

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if(amount <= 0)
        return

      const { data } = await api.get(`stock/${productId}`)
      const stockAmount = data.amount

      if(stockAmount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const product = cart.find(c => c.id === productId)

      if(product) {
        const newCart = cart.map(cart => {
          if(cart.id === product.id) {
            return { ...cart, amount }
          } else {
            return cart
          }
        })

        setCart(newCart)
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
