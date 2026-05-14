import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { createOrder, getOrderByPaymentIntentId, updateOrder, getUserOrders } from "./db";
import { PRODUCTS } from "./products";
import Stripe from "stripe";
import { TRPCError } from "@trpc/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export const paymentRouter = router({
  // Create a checkout session for the Gen AI Toolkit
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const product = PRODUCTS.GENAI_TOOLKIT;

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: product.currency,
                product_data: {
                  name: product.name,
                  description: product.description,
                },
                unit_amount: product.price,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${ctx.req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${ctx.req.headers.origin}/`,
          customer_email: input.email,
          client_reference_id: ctx.user?.id.toString() || input.email,
          metadata: {
            user_id: ctx.user?.id.toString() || "guest",
            customer_email: input.email,
            customer_name: input.name || "",
            product_id: product.id,
          },
          allow_promotion_codes: true,
        });

        return {
          checkoutUrl: session.url,
          sessionId: session.id,
        };
      } catch (error) {
        console.error("[Payment] Checkout session creation failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session",
        });
      }
    }),

  // Get order details by session ID
  getOrderBySessionId: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      try {
        const session = await stripe.checkout.sessions.retrieve(input.sessionId);

        if (!session.payment_intent) {
          return null;
        }

        const order = await getOrderByPaymentIntentId(
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id
        );

        return order || null;
      } catch (error) {
        console.error("[Payment] Failed to retrieve order:", error);
        return null;
      }
    }),

  // Get user's order history (protected)
  getMyOrders: protectedProcedure.query(async ({ ctx }) => {
    try {
      const orders = await getUserOrders(ctx.user.id);
      return orders;
    } catch (error) {
      console.error("[Payment] Failed to retrieve user orders:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve orders",
      });
    }
  }),
});
