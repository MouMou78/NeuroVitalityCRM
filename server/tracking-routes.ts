import { Router } from "express";
import { recordEmailOpen, recordEmailClick, generateTrackingPixelImage } from "./email-tracking";

const router = Router();

/**
 * Email open tracking endpoint
 * Returns a 1x1 transparent PNG pixel
 */
router.get("/track/open/:trackingId", async (req, res) => {
  const { trackingId } = req.params;
  
  try {
    // Record the open event (fire and forget)
    recordEmailOpen(trackingId).catch(err => {
      console.error("[Tracking Route] Error recording open:", err);
    });
    
    // Return tracking pixel immediately
    const pixel = generateTrackingPixelImage();
    res.set({
      "Content-Type": "image/png",
      "Content-Length": pixel.length,
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.send(pixel);
  } catch (error: any) {
    console.error("[Tracking Route] Error in open tracking:", error.message);
    // Still return pixel even on error
    const pixel = generateTrackingPixelImage();
    res.set("Content-Type", "image/png");
    res.send(pixel);
  }
});

/**
 * Email click tracking endpoint
 * Redirects to the original URL after recording the click
 */
router.get("/track/click/:trackingId", async (req, res) => {
  const { trackingId } = req.params;
  const { url } = req.query;
  
  try {
    if (!url || typeof url !== "string") {
      return res.status(400).send("Missing or invalid URL parameter");
    }
    
    // Record the click event (fire and forget)
    recordEmailClick(trackingId, url).catch(err => {
      console.error("[Tracking Route] Error recording click:", err);
    });
    
    // Redirect to original URL immediately
    res.redirect(url);
  } catch (error: any) {
    console.error("[Tracking Route] Error in click tracking:", error.message);
    // Redirect anyway if URL is valid
    if (url && typeof url === "string") {
      res.redirect(url);
    } else {
      res.status(400).send("Invalid tracking request");
    }
  }
});

export default router;
